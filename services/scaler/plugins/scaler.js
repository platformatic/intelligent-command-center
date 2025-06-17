'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')
const createLeaderElector = require('../lib/leader')

async function plugin (app) {
  const lock = Number(process.env.PLT_SCALER_LOCK) || 4242
  const poll = Number(process.env.PLT_SCALER_LEADER_POLL) || 10000
  const periodicTriggerInterval = (Number(process.env.PLT_SCALER_PERIODIC_TRIGGER) || 60) * 1000
  const { db } = app.platformatic
  let periodicTriggerController = null
  let isLeader = false

  // Only one instance of the scaler receive and process the notification
  const scaler = createLeaderElector({
    db,
    lock,
    poll,
    channel: 'trigger_scaler',
    log: app.log,
    onNotification: app.scalerExecutor.checkScalingOnAlert.bind(app.scalerExecutor),
    onLeadershipChange: async (newIsLeader) => {
      if (newIsLeader !== isLeader) {
        isLeader = newIsLeader
        app.log.info({ isLeader }, 'Leadership status changed')

        if (isLeader) {
          startPeriodicTrigger()
          // Start prediction scheduling if available
          if (app.startPredictionScheduling) {
            await app.startPredictionScheduling()
          }
        } else {
          stopPeriodicTrigger()
          // Stop prediction scheduling if available
          if (app.stopPredictionScheduling) {
            await app.stopPredictionScheduling()
          }
        }
      }
    }
  })

  async function startPeriodicTrigger () {
    if (periodicTriggerController && !periodicTriggerController.signal.aborted) {
      return
    }

    periodicTriggerController = new AbortController()
    const { signal } = periodicTriggerController

    app.log.info({ interval: periodicTriggerInterval }, 'Starting periodic scaler trigger')

    // Only runs on leader
    try {
      while (!signal.aborted) {
        await setTimeout(periodicTriggerInterval, null, { signal })

        if (isLeader) {
          app.log.info('Executing periodic scaler trigger')
          try {
            await app.scalerExecutor.checkScalingOnMetrics()
          } catch (err) {
            app.log.error({ err }, 'Error during periodic trigger execution')
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        app.log.error({ err }, 'Error in periodic trigger loop')
        // Restart the loop after a short delay if not aborted
        if (!signal.aborted) {
          setTimeout(1000).then(() => {
            if (isLeader) {
              startPeriodicTrigger()
            }
          })
        }
      }
    }
  }

  function stopPeriodicTrigger () {
    if (periodicTriggerController) {
      periodicTriggerController.abort()
      periodicTriggerController = null
      app.log.info('Stopped periodic scaler trigger')
    }
  }

  app.addHook('onClose', async () => {
    stopPeriodicTrigger()
    await scaler.stop()
  })

  app.decorate('notifyScaler', async function (podId) {
    await scaler.notify(podId)
  })

  app.decorate('isScalerLeader', function () {
    return isLeader
  })

  scaler.start()
}

module.exports = fp(plugin, {
  name: 'scaler',
  dependencies: ['env', 'scaler-executor', 'prediction-scheduler']
})
