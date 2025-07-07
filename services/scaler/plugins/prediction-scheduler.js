'use strict'

const fp = require('fastify-plugin')
const TrendsLearningAlgorithm = require('../lib/trends-learning-algorithm')

async function plugin (app) {
  const trendsAlgorithm = new TrendsLearningAlgorithm(app)
  app.decorate('trendsLearningAlgorithm', trendsAlgorithm)
  let predictionTimeout = null
  let isSchedulingActive = false

  async function executePrediction (prediction) {
    const { applicationId, action, pods, confidence, reasons } = prediction

    try {
      if (!app.scalerExecutor) {
        app.log.warn('Scaler executor not available, skipping prediction execution')
        return
      }

      let currentPodCount
      try {
        currentPodCount = await app.scalerExecutor.getCurrentPodCount(applicationId)
      } catch (err) {
        app.log.warn({ applicationId }, 'No controller found for application, skipping prediction execution')
        return
      }

      let targetPods = pods
      if (action === 'up') {
        targetPods = Math.max(currentPodCount, pods)
      } else if (action === 'down') {
        targetPods = Math.min(currentPodCount, pods)
      }

      const { minPods, maxPods } = await app.scalerExecutor.getScaleConfig(applicationId)
      targetPods = app.scalerExecutor.applyScaleConstraints(targetPods, minPods, maxPods)

      if (targetPods === currentPodCount) {
        app.log.info({
          applicationId,
          currentPodCount,
          predictedPods: pods,
          action,
          confidence,
          reasons
        }, 'Prediction does not require scaling, current pod count is optimal')
        return
      }

      const scalingAction = targetPods > currentPodCount ? 'SCALE UP' : 'SCALE DOWN'
      const reason = `Prediction-based ${scalingAction.toLowerCase()}: ${reasons.join(', ')} (confidence: ${(confidence * 100).toFixed(0)}%)`

      app.log.info({
        applicationId,
        currentPodCount,
        targetPods,
        action: scalingAction,
        confidence,
        reasons,
        source: 'prediction'
      }, `Executing prediction: ${scalingAction} from ${currentPodCount} to ${targetPods} pods`)

      const result = await app.scalerExecutor.executeScaling(applicationId, targetPods, reason)

      if (result.success) {
        app.log.info({
          applicationId,
          previousPodCount: currentPodCount,
          newPodCount: targetPods,
          action: scalingAction,
          confidence,
          source: 'prediction'
        }, 'Prediction executed successfully')

        // Record prediction-based scaling event in performance history for feedback loop.
        // This enables the trends learning algorithm to evaluate prediction effectiveness
        // and improve future predictions through success score calculation and decay weighting.
        if (app.trendsLearningAlgorithm) {
          await app.trendsLearningAlgorithm.recordPredictionScaling(applicationId, {
            action,
            pods: targetPods,
            confidence,
            timeOfDay: prediction.timeOfDay,
            reasons
          })
        }
      } else {
        app.log.error({
          applicationId,
          targetPods,
          error: result.error,
          prediction
        }, 'Failed to execute prediction scaling')
      }
    } catch (err) {
      app.log.error({
        err,
        applicationId,
        prediction
      }, 'Error executing prediction')
    }
  }

  async function scheduleNextPrediction () {
    if (!isSchedulingActive) {
      app.log.debug('Scheduling not active, skipping prediction scheduling')
      return
    }

    try {
      if (predictionTimeout) {
        clearTimeout(predictionTimeout)
        predictionTimeout = null
      }

      const nextPrediction = await app.store.getNextPrediction()

      if (!nextPrediction) {
        app.log.info('No predictions to schedule')
        return
      }

      const now = Date.now()
      const timeUntilPrediction = nextPrediction.absoluteTime - now

      if (timeUntilPrediction <= 0) {
        app.log.info({
          applicationId: nextPrediction.applicationId,
          prediction: nextPrediction
        }, 'Executing overdue prediction immediately')

        await executePrediction(nextPrediction)
        await app.store.removePrediction(nextPrediction)

        await scheduleNextPrediction()
      } else {
        app.log.info({
          applicationId: nextPrediction.applicationId,
          timeUntilPrediction,
          scheduledTime: new Date(nextPrediction.absoluteTime).toISOString()
        }, 'Scheduling next prediction')

        predictionTimeout = setTimeout(async () => {
          try {
            app.log.info({
              applicationId: nextPrediction.applicationId,
              prediction: nextPrediction
            }, 'Prediction timer triggered')

            await executePrediction(nextPrediction)
            await app.store.removePrediction(nextPrediction)

            await scheduleNextPrediction()
          } catch (err) {
            app.log.error({ err, prediction: nextPrediction }, 'Error executing scheduled prediction')
          }
        }, timeUntilPrediction)
      }
    } catch (err) {
      app.log.error({ err }, 'Error scheduling prediction')
    }
  }

  async function startPredictionScheduling () {
    if (isSchedulingActive) {
      return
    }

    isSchedulingActive = true
    app.log.info('Starting prediction scheduling')
    await scheduleNextPrediction()
  }

  async function stopPredictionScheduling () {
    isSchedulingActive = false

    if (predictionTimeout) {
      clearTimeout(predictionTimeout)
      predictionTimeout = null
    }

    app.log.info('Stopped prediction scheduling')
  }

  app.decorate('startPredictionScheduling', startPredictionScheduling)
  app.decorate('stopPredictionScheduling', stopPredictionScheduling)
  app.decorate('scheduleNextPrediction', scheduleNextPrediction)

  app.addHook('onClose', async () => {
    await stopPredictionScheduling()
  })
}

module.exports = fp(plugin, {
  name: 'prediction-scheduler',
  dependencies: ['store', 'scaler-executor']
})
