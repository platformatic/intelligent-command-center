'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  app.decorate('recordScalingActivity', async function (applicationId, oldReplicas, newReplicas, direction, reason) {
    try {
      // Get application name from control-plane
      let applicationName = 'Unknown'
      try {
        // Create a temporary client instance
        const controlPlane = app.platformaticContext.clients.controlPlane
        const application = await controlPlane.getApplication({ applicationId })
        applicationName = application.name
      } catch (err) {
        app.log.warn({ err, applicationId }, 'Failed to get application name from control-plane')
      }

      const activityType = direction === 'up' ? 'SCALED_UP' : 'SCALED_DOWN'

      // Create a temporary client instance for activities
      const activities = app.platformaticContext.clients.activities
      await activities.postEvents({
        type: activityType,
        applicationId,
        targetId: applicationId,
        success: true,
        data: {
          applicationName,
          oldReplicas,
          newReplicas,
          /* c8 ignore next */
          reason: reason || 'Automatic scaling'
        }
      })

      app.log.info({ applicationId, activityType, oldReplicas, newReplicas }, 'Scaling activity recorded')
    } catch (err) {
      app.log.error({ err, applicationId }, 'Failed to record scaling activity')
    }
  })
}, {
  name: 'activities',
  dependencies: []
})
