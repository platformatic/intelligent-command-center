'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')

module.exports = fp(async function (app) {
  // Service URLs for direct HTTP calls. We cannot use the platformatic clients here because they are accesible from the request, which is not available here
  const controlPlaneUrl = process.env.PLT_CONTROL_PLANE_URL || 'http://control-plane.plt.local'
  const activitiesUrl = process.env.PLT_ACTIVITIES_URL || 'http://activities.plt.local'

  app.decorate('recordScalingActivity', async function (applicationId, oldReplicas, newReplicas, direction, reason) {
    try {
      // Get application name from control-plane
      let applicationName = 'Unknown'
      try {
        const { statusCode, body } = await request(`${controlPlaneUrl}/applications/${applicationId}`, {
          method: 'GET',
          headers: {
            'content-type': 'application/json'
          }
        })

        if (statusCode === 200) {
          const application = await body.json()
          applicationName = application.name
        }
      } catch (err) {
        app.log.warn({ err, applicationId }, 'Failed to get application name from control-plane')
      }

      const activityType = direction === 'up' ? 'SCALED_UP' : 'SCALED_DOWN'

      // Send activity event using direct HTTP call
      const { statusCode, body } = await request(`${activitiesUrl}/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
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
      })

      if (statusCode !== 200 && statusCode !== 201) {
        const error = await body.text()
        throw new Error(`Failed to post activity: ${error}`)
      }

      app.log.info({ applicationId, activityType, oldReplicas, newReplicas }, 'Scaling activity recorded')
    } catch (err) {
      app.log.error({ err, applicationId }, 'Failed to record scaling activity')
    }
  })

  app.decorate('recordConfigActivity', async function (applicationId, oldConfig, newConfig, source) {
    try {
      let applicationName = 'Unknown'
      try {
        const { statusCode, body } = await request(`${controlPlaneUrl}/applications/${applicationId}`, {
          method: 'GET',
          headers: {
            'content-type': 'application/json'
          }
        })

        if (statusCode === 200) {
          const application = await body.json()
          applicationName = application.name
        }
      } catch (err) {
        app.log.warn({ err, applicationId }, 'Failed to get application name from control-plane')
      }

      const { statusCode, body } = await request(`${activitiesUrl}/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CONFIG_UPDATE',
          applicationId,
          targetId: applicationId,
          success: true,
          data: {
            applicationName,
            oldConfig,
            newConfig,
            source: source || 'kubernetes-labels'
          }
        })
      })

      if (statusCode !== 200 && statusCode !== 201) {
        const error = await body.text()
        throw new Error(`Failed to post config activity: ${error}`)
      }

      app.log.info({ applicationId, oldConfig, newConfig, source }, 'Configuration activity recorded')
    } catch (err) {
      app.log.error({ err, applicationId }, 'Failed to record configuration activity')
    }
  })
}, {
  name: 'activities',
  dependencies: []
})
