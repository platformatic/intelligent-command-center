'use strict'

const fp = require('fastify-plugin')
const createLeaderElector = require('../lib/leader')

async function plugin (app) {
  const lock = Number(process.env.PLT_SCALER_LOCK) || 4242
  const poll = Number(process.env.PLT_SCALER_LEADER_POLL) || 10000
  const { db } = app.platformatic
  let isLeader = false

  // Create leader elector to manage leadership
  const leaderElector = createLeaderElector({
    db,
    lock,
    poll,
    channel: 'trigger_scaler',
    log: app.log,
    onNotification: (payload) => {
      // Delegate notification handling to scaler if available
      if (app.scalerExecutor && app.scalerExecutor.checkScalingOnAlert) {
        return app.scalerExecutor.checkScalingOnAlert(payload)
      }
    },
    onLeadershipChange: async (newIsLeader) => {
      if (newIsLeader !== isLeader) {
        isLeader = newIsLeader
        app.log.info({ isLeader }, 'Leadership status changed')

        if (isLeader) {
          // Activate scaler periodic trigger
          if (app.startScalerTrigger) {
            await app.startScalerTrigger()
          }
          // Start prediction scheduling if available
          if (app.startPredictionScheduling) {
            await app.startPredictionScheduling()
          }
        } else {
          // Deactivate scaler periodic trigger
          if (app.stopScalerTrigger) {
            await app.stopScalerTrigger()
          }
          // Stop prediction scheduling if available
          if (app.stopPredictionScheduling) {
            await app.stopPredictionScheduling()
          }
        }
      }
    }
  })

  app.addHook('onClose', async () => {
    await leaderElector.stop()
  })

  app.decorate('notifyScaler', async function (podId) {
    await leaderElector.notify(podId)
  })

  app.decorate('isScalerLeader', function () {
    return isLeader
  })

  leaderElector.start()
}

module.exports = fp(plugin, {
  name: 'leader',
  dependencies: ['env', 'scaler-executor', 'prediction-scheduler']
})
