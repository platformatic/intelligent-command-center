'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

module.exports = fp(async function (app) {
  const defaultMinPods = app.env.PLT_SCALER_MIN_PODS_DEFAULT
  const defaultMaxPods = app.env.PLT_SCALER_MAX_PODS_DEFAULT

  app.decorate('getScaleConfig', async (applicationId) => {
    const scaleConfigs = await app.platformatic.entities.applicationScaleConfig.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    })
    return scaleConfigs.length > 0 ? scaleConfigs[0] : null
  })

  function clamp (value, lo, hi) {
    if (lo != null && value < lo) value = lo
    if (hi != null && value > hi) value = hi
    return value
  }

  app.decorate('getScalingLimits', async (applicationId) => {
    const [hard, soft] = await Promise.all([
      app.getScaleConfig(applicationId),
      app.store.getSoftLimits(applicationId)
    ])

    if (hard === null && soft === null) return null

    const hardMin = hard?.minPods ?? null
    const hardMax = hard?.maxPods ?? null

    let minPods = hardMin
    let maxPods = hardMax

    if (soft) {
      if (soft.min != null) {
        minPods = clamp(soft.min, hardMin, hardMax)
      }
      if (soft.max != null) {
        maxPods = clamp(soft.max, hardMin, hardMax)
      }
    }

    if (minPods != null && maxPods != null && minPods > maxPods) {
      minPods = maxPods
    }
    return { minPods, maxPods }
  })

  // Bring a controller into a pod window NOW, and push the window into the live signal scaler so its
  // in-memory config is not stale.
  //
  // Limits are otherwise only a CLAMP applied when an algorithm happens to make a decision — v2 only
  // decides when pods stream signals, so an idle application would sit below a new floor indefinitely.
  // A schedule has to be able to raise the floor with no traffic at all, so it actuates here.
  async function applyPodWindow (applicationId, controller, { minPods, maxPods }) {
    const replicas = controller.replicas
    if (minPods != null && replicas < minPods) {
      await app.updateControllerReplicas(applicationId, minPods)
    }
    if (maxPods != null && replicas > maxPods) {
      await app.updateControllerReplicas(applicationId, maxPods)
    }

    if (app.signalScalerExecutor) {
      await app.signalScalerExecutor.updateApplicationConfig(applicationId, {
        pods: { min: minPods, max: maxPods }
      })
    }
  }

  // Re-apply the EFFECTIVE window (hard ∩ soft). The scheduler calls this on every tick — that is what
  // makes an accepted suggestion actually scale the application.
  //
  // Unlike saveScaleConfig this must never throw: the tick sweeps every application with a schedule or
  // an active suggestion, and one that is not deployed yet simply has no controller to move.
  app.decorate('enforceScalingLimits', async (applicationId) => {
    const [limits, controller] = await Promise.all([
      app.getScalingLimits(applicationId),
      app.getApplicationController(applicationId)
    ])
    if (limits === null || controller === null) return
    await applyPodWindow(applicationId, controller, limits)
  })

  app.decorate('saveScaleConfig', async (applicationId, config) => {
    const controller = await app.getApplicationController(applicationId)
    /* c8 ignore next 3 */
    if (controller === null) {
      throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
    }
    await applyPodWindow(applicationId, controller, { minPods: config.minPods, maxPods: config.maxPods })

    return app.platformatic.entities.applicationScaleConfig.save({
      input: {
        applicationId,
        minPods: config.minPods,
        maxPods: config.maxPods
      }
    })
  })

  app.decorate('saveDefaultScaleConfig', async (applicationId) => {
    const scaleConfig = await app.getScaleConfig(applicationId)
    /* c8 ignore next */
    if (scaleConfig !== null) return

    await app.platformatic.entities.applicationScaleConfig.save({
      input: {
        applicationId,
        minPods: defaultMinPods,
        maxPods: defaultMaxPods
      }
    })
  })
}, {
  name: 'scale-config',
  dependencies: ['env', 'store']
})
