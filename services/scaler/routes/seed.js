'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')

const bodySchema = {
  type: 'object',
  required: ['applicationName', 'windows'],
  properties: {
    applicationName: { type: 'string' },
    replace: { type: 'boolean', default: true },
    windows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['slotStart', 'slotEnd', 'slotOfDay', 'pods'],
        properties: {
          slotStart: { type: 'string' },
          slotEnd: { type: 'string' },
          slotOfDay: { type: 'integer' },
          localSlotOfDay: { type: 'integer' },
          pods: { type: 'integer' }
        }
      }
    }
  }
}

module.exports = fp(async function (app) {
  const { entities, db, sql } = app.platformatic
  const controlPlaneUrl = (process.env.PLT_CONTROL_PLANE_URL || 'http://control-plane.plt.local').replace(/\/+$/, '')

  // One-shot demo seed: resolve the application by NAME via control-plane, replace its time-window
  // history with the supplied windows, then (re)compute categories and predictions — all in one call.
  // Destructive (clears the app's windows); whitelisted only when PLT_SCALER_SEED_API_ENABLED is set.
  app.post('/applications/seed', {
    bodyLimit: 16 * 1024 * 1024,
    schema: { body: bodySchema },
    handler: async (req) => {
      const { applicationName, windows, replace = true } = req.body

      // resolve name → id via control-plane (internal, no gateway auth)
      const url = `${controlPlaneUrl}/applications?where.name.eq=${encodeURIComponent(applicationName)}`
      const { statusCode, body } = await request(url)
      if (statusCode !== 200) {
        throw new Error(`control-plane lookup failed (${statusCode}) for "${applicationName}"`)
      }
      const apps = await body.json()
      if (!Array.isArray(apps) || apps.length === 0) {
        const err = new Error(`application "${applicationName}" not found`)
        err.statusCode = 404
        throw err
      }
      const applicationId = apps[0].id

      // replace the window history
      if (replace) {
        await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${applicationId}`)
      }
      const inputs = windows.map((w) => ({
        applicationId,
        slotStart: new Date(w.slotStart),
        slotEnd: new Date(w.slotEnd),
        slotOfDay: w.slotOfDay,
        localSlotOfDay: w.localSlotOfDay ?? w.slotOfDay,
        pods: w.pods
      }))
      for (let i = 0; i < inputs.length; i += 500) {
        await entities.timeWindowStat.insert({ inputs: inputs.slice(i, i + 500) })
      }

      // colors + forecasts
      const thresholds = await app.updateWindowCategories(applicationId)
      const predictionsWritten = await app.updatePredictions(applicationId)

      return { applicationId, inserted: inputs.length, thresholds, predictionsWritten }
    }
  })
}, { name: 'seed-routes', dependencies: ['window-category', 'pattern-predictor'] })
