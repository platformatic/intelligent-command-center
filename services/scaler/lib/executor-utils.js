'use strict'

const { request } = require('undici')

async function getApplicationName (applicationId, log) {
  const controlPlaneUrl = process.env.PLT_CONTROL_PLANE_URL || 'http://control-plane.plt.local'
  try {
    const { statusCode, body } = await request(`${controlPlaneUrl}/applications/${applicationId}`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json'
      }
    })

    if (statusCode === 200) {
      const application = await body.json()
      return application.name
    }
  } catch (err) {
    log.warn({ err, applicationId }, 'Failed to get application name from control-plane')
  }
  return null
}

module.exports = {
  getApplicationName
}
