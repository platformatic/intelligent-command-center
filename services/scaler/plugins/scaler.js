'use strict'

const fp = require('fastify-plugin')
const createLeaderElector = require('../lib/leader')

async function plugin (app) {
  const lock = Number(process.env.PLT_SCALER_LOCK) || 4242
  const poll = Number(process.env.PLT_SCALER_LEADER_POLL) || 10000
  const { db } = app.platformatic

  // Only one instance of the scaler receive and process the notification
  const scaler = createLeaderElector({
    db,
    lock,
    poll,
    channel: 'trigger_scaler',
    log: app.log,
    onNotification: app.scalerExecutor.execute
  })

  app.addHook('onClose', async () => {
    await scaler.stop()
  })

  app.decorate('notifyScaler', async function (podId) {
    await scaler.notify(podId)
  })

  app.decorate('isScalerLeader', function () {
    return scaler.isLeader()
  })

  scaler.start()
}

module.exports = fp(plugin, {
  name: 'scaler',
  dependencies: ['env', 'scaler-executor']
})
