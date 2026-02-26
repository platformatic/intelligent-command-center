'use strict'

const fp = require('fastify-plugin')
const createLeaderElector = require('../../../lib/leader')

async function plugin (app) {
  const lock = Number(process.env.PLT_CONTROL_PLANE_LEADER_LOCK) || 4243
  const poll = Number(process.env.PLT_CONTROL_PLANE_LEADER_POLL) || 10000
  const { db } = app.platformatic
  let isLeader = false
  const leaderCallbacks = []
  const loseLeaderCallbacks = []

  app.decorate('onBecomeLeader', function (fn) {
    leaderCallbacks.push(fn)
  })

  app.decorate('onLoseLeadership', function (fn) {
    loseLeaderCallbacks.push(fn)
  })

  const leaderElector = createLeaderElector({
    db,
    lock,
    poll,
    channels: [
      {
        channel: 'control_plane_leader',
        onNotification: () => {}
      }
    ],
    log: app.log,
    onLeadershipChange: (newIsLeader) => {
      if (newIsLeader !== isLeader) {
        isLeader = newIsLeader
        app.log.info({ isLeader }, 'Control-plane leadership status changed')
        if (isLeader) {
          for (const fn of leaderCallbacks) {
            fn().catch(err => app.log.error({ err }, 'error in leader callback'))
          }
        } else {
          for (const fn of loseLeaderCallbacks) {
            fn().catch(err => app.log.error({ err }, 'error in lose-leadership callback'))
          }
        }
      }
    }
  })

  app.addHook('onClose', async () => {
    await leaderElector.stop()
  })

  app.decorate('isControlPlaneLeader', function () {
    return isLeader
  })

  app.addHook('onReady', () => {
    leaderElector.start()
  })
}

module.exports = fp(plugin, {
  name: 'leader',
  dependencies: ['env']
})
