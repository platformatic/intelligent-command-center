'use strict'

const fp = require('fastify-plugin')
const createLeaderElector = require('../lib/leader')

// Notification channel names
const CHANNEL_REACTIVE_SCALER = 'trigger_scaler'
const CHANNEL_SIGNAL_SCALER = 'trigger_signal_scaler'

async function plugin (app) {
  const lock = Number(process.env.PLT_SCALER_LOCK) || 4242
  const poll = Number(process.env.PLT_SCALER_LEADER_POLL) || 10000
  const { db } = app.platformatic
  let isLeader = false

  const startPeriodicServices = () => {
    // Start periodic scaler V1 trigger if available
    if (app.startScalerTrigger) {
      app.startScalerTrigger()
    }

    // Start periodic signal scaler trigger if available
    if (app.startScalerV2Trigger) {
      app.startScalerV2Trigger()
    }

    // Start prediction scheduling if available
    if (app.startPredictionScheduling) {
      app.startPredictionScheduling()
    }

    // Start K8s sync if available
    if (app.startK8sSync) {
      app.startK8sSync()
    }
  }

  const stopPeriodicServices = () => {
    // Stop periodic scaler V1 trigger if available
    if (app.stopScalerTrigger) {
      app.stopScalerTrigger()
    }

    // Stop periodic signal scaler trigger if available
    if (app.stopScalerV2Trigger) {
      app.stopScalerV2Trigger()
    }

    // Stop prediction scheduling if available
    if (app.stopPredictionScheduling) {
      app.stopPredictionScheduling()
    }

    // Stop K8s sync if available
    if (app.stopK8sSync) {
      app.stopK8sSync()
    }
  }

  // Create leader elector with multiple notification channels
  const leaderElector = createLeaderElector({
    db,
    lock,
    poll,
    channels: [
      {
        channel: CHANNEL_REACTIVE_SCALER,
        onNotification: (payload) => {
          // Delegate notification handling to v1 reactive scaler if available
          if (app.scalerExecutor && app.scalerExecutor.checkScalingOnAlert) {
            return app.scalerExecutor.checkScalingOnAlert(payload)
          }
        }
      },
      {
        channel: CHANNEL_SIGNAL_SCALER,
        onNotification: (payload) => {
          // Delegate notification handling to v2 signal scaler if available
          if (app.signalScalerExecutor && app.signalScalerExecutor.checkScalingOnSignals) {
            return app.signalScalerExecutor.checkScalingOnSignals(payload)
          }
        }
      }
    ],
    log: app.log,
    onLeadershipChange: async (newIsLeader) => {
      if (newIsLeader !== isLeader) {
        isLeader = newIsLeader
        app.log.info({ isLeader }, 'Leadership status changed')
        if (isLeader) {
          startPeriodicServices()
        } else {
          stopPeriodicServices()
        }
      }
    }
  })

  app.addHook('onClose', async () => {
    await leaderElector.stop()
  })

  app.decorate('notifyScaler', async function (podId, serviceId) {
    await leaderElector.notify({ podId, serviceId }, CHANNEL_REACTIVE_SCALER)
  })

  app.decorate('notifySignalScaler', async function (applicationId, serviceId) {
    await leaderElector.notify({ applicationId, serviceId }, CHANNEL_SIGNAL_SCALER)
  })

  app.decorate('isScalerLeader', function () {
    return isLeader
  })

  leaderElector.start()
}

module.exports = fp(plugin, {
  name: 'leader',
  dependencies: ['env', 'scaler-executor', 'prediction-scheduler', 'k8s-sync']
})
