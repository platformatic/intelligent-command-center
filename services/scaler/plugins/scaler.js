'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')

async function plugin (app) {
  let isServerClosed = false
  const periodicTriggerInterval = (Number(process.env.PLT_SCALER_PERIODIC_TRIGGER) || 60) * 1000
  let periodicTriggerController = null

  async function scheduleTrigger () {
    const { signal } = periodicTriggerController

    if (signal.aborted) {
      return
    }

    try {
      await setTimeout(periodicTriggerInterval, null, { signal })
      if (!signal.aborted) {
        app.log.info('Executing periodic scaler trigger')
        try {
          await app.scalerExecutor.checkScalingOnMetrics()
        } catch (err) {
          app.log.error({ err }, 'Error during periodic trigger execution')
        }
        // Schedule next trigger
        scheduleTrigger()
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }
      app.log.error({ err }, 'Error in periodic trigger, retrying after delay')
      try {
        await setTimeout(1000, null, { signal })
        // Retry scheduling
        scheduleTrigger()
      } catch (delayErr) {
        if (delayErr.name === 'AbortError') {
          return
        }
        app.log.error({ err: delayErr }, 'Error in retry delay')
      }
    }
  }

  async function startPeriodicTrigger () {
    if ((periodicTriggerController && !periodicTriggerController.signal.aborted) || isServerClosed) {
      return
    }

    periodicTriggerController = new AbortController()
    app.log.info({ interval: periodicTriggerInterval }, 'Starting periodic scaler trigger')

    // Start the recursive scheduling
    scheduleTrigger()
  }

  function stopPeriodicTrigger () {
    if (periodicTriggerController) {
      periodicTriggerController.abort()
      periodicTriggerController = null
      app.log.info('Stopped periodic scaler trigger')
    }
  }

  app.addHook('onClose', async () => {
    isServerClosed = true
    stopPeriodicTrigger()
  })

  app.decorate('startScalerTrigger', startPeriodicTrigger)
  app.decorate('stopScalerTrigger', stopPeriodicTrigger)
}

module.exports = fp(plugin, {
  name: 'scaler',
  dependencies: ['env', 'scaler-executor']
})
