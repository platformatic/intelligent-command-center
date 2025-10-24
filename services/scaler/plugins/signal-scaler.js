'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')

async function plugin (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION

  if (algorithmVersion !== 'v2') {
    app.log.info({ algorithmVersion }, 'Signal Scaler plugin skipped - algorithm version is not v2')
    return
  }

  let isServerClosed = false
  const periodicTriggerInterval = (Number(process.env.PLT_SIGNALS_SCALER_PERIODIC_TRIGGER) || 60) * 1000
  let periodicTriggerController = null

  async function scheduleTrigger () {
    if (!periodicTriggerController) {
      return
    }

    const { signal } = periodicTriggerController

    if (signal.aborted) {
      return
    }

    try {
      await setTimeout(periodicTriggerInterval, null, { signal })
      if (!signal.aborted) {
        app.log.info('[Signal Scaler] Executing periodic signal scaler trigger (leader-only)')
        try {
          if (app.signalScalerExecutor) {
            await app.signalScalerExecutor.checkScalingForAllApplications()
          } else {
            app.log.warn('[Signal Scaler] signalScalerExecutor not available')
          }
        } catch (err) {
          app.log.error({ err }, '[Signal Scaler] Error during periodic trigger execution')
        }
        scheduleTrigger()
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }
      app.log.error({ err }, '[Signal Scaler] Error in periodic trigger, retrying after delay')
      try {
        await setTimeout(1000, null, { signal })
        scheduleTrigger()
      } catch (delayErr) {
        if (delayErr.name === 'AbortError') {
          return
        }
        app.log.error({ err: delayErr }, '[Signal Scaler] Error in retry delay')
      }
    }
  }

  async function startPeriodicTrigger () {
    if ((periodicTriggerController && !periodicTriggerController.signal.aborted) || isServerClosed) {
      return
    }

    periodicTriggerController = new AbortController()
    app.log.info({
      interval: periodicTriggerInterval,
      algorithmVersion
    }, '[Signal Scaler] Starting periodic signal scaler trigger')

    scheduleTrigger()
  }

  function stopPeriodicTrigger () {
    if (periodicTriggerController) {
      periodicTriggerController.abort()
      periodicTriggerController = null
      app.log.info('[Signal Scaler] Stopped periodic signal scaler trigger')
    }
  }

  app.addHook('onClose', async () => {
    isServerClosed = true
    stopPeriodicTrigger()
  })

  app.decorate('startScalerV2Trigger', startPeriodicTrigger)
  app.decorate('stopScalerV2Trigger', stopPeriodicTrigger)

  app.log.info({ algorithmVersion }, '[Signal Scaler] Signal Scaler plugin initialized')
}

module.exports = fp(plugin, {
  name: 'signal-scaler',
  dependencies: ['env', 'leader', 'signal-scaler-executor']
})
