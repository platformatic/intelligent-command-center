'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const { slotId } = require('../lib/ids')

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
          pods: { type: 'integer' },
          prediction: { type: ['integer', 'null'] } // the day-by-day replayed frozen forecast, if any
        }
      }
    }
  }
}

module.exports = fp(async function (app) {
  if (app.env.PLT_SCALER_ALGORITHM_VERSION === 'v1') return

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

      // replace the window history (stats + the frozen predictions that go with it)
      if (replace) {
        await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${applicationId}`)
        await db.query(sql`DELETE FROM time_window_predictions WHERE application_id = ${applicationId}`)
      }
      // Seeded/demo history has no real "actual" run count, so derive one from the desired `pods`
      // clamped to the app's configured limits — a null bound leaves that side unclamped. This makes
      // actual diverge from desired at the extremes, as real scaling would.
      const { minPods, maxPods } = await app.getScalingLimits(applicationId)
      const actualFor = (pods) => {
        if (minPods != null && pods < minPods) return minPods
        if (maxPods != null && pods > maxPods) return maxPods
        return pods
      }
      const inputs = windows.map((w) => ({
        // id is derived from (application_id, slot_start) — see lib/ids.js. The DB has no id default.
        id: slotId('stats', applicationId, new Date(w.slotStart)),
        applicationId,
        slotStart: new Date(w.slotStart),
        slotEnd: new Date(w.slotEnd),
        slotOfDay: w.slotOfDay,
        localSlotOfDay: w.localSlotOfDay ?? w.slotOfDay,
        pods: w.pods,
        actualPods: w.actualPods ?? actualFor(w.pods)
      }))
      for (let i = 0; i < inputs.length; i += 500) {
        await entities.timeWindowStat.insert({ inputs: inputs.slice(i, i + 500) })
      }

      // Seed the day-by-day replayed frozen predictions for the past windows, so the suggestion
      // columns carry a real predicted-vs-actual history from the first run. updatePredictions below
      // only writes FUTURE forecasts (slot_start ≥ now), so these past rows survive untouched.
      const percentile = app.env.PLT_SCALER_PATTERN_PERCENTILE
      const predInputs = windows
        .filter((w) => w.prediction != null)
        .map((w) => ({
          // id is derived from (application_id, slot_start) — see lib/ids.js. The DB has no id default.
          id: slotId('pred', applicationId, new Date(w.slotStart)),
          applicationId,
          slotStart: new Date(w.slotStart),
          slotEnd: new Date(w.slotEnd),
          slotOfDay: w.slotOfDay,
          percentile,
          predictedPods: w.prediction
        }))
      for (let i = 0; i < predInputs.length; i += 500) {
        await entities.timeWindowPrediction.insert({ inputs: predInputs.slice(i, i + 500) })
      }

      // colors + forecasts (updatePredictions also refreshes the cached suggestions, whose columns
      // now read the seeded past predictions above)
      const thresholds = await app.updateWindowCategories(applicationId)
      const predictionsWritten = await app.updatePredictions(applicationId)

      return { applicationId, inserted: inputs.length, predictionsSeeded: predInputs.length, thresholds, predictionsWritten }
    }
  })
}, { name: 'seed-routes', dependencies: ['window-category', 'pattern-predictor', 'scale-config'] })
