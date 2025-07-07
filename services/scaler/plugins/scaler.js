'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')

async function plugin (app) {
  const periodicTriggerInterval = (Number(process.env.PLT_SCALER_PERIODIC_TRIGGER) || 60) * 1000
  let periodicTriggerController = null

  async function startPeriodicTrigger () {
    if (periodicTriggerController && !periodicTriggerController.signal.aborted) {
      return
    }

    periodicTriggerController = new AbortController()
    const { signal } = periodicTriggerController

    app.log.info({ interval: periodicTriggerInterval }, 'Starting periodic scaler trigger')

    // Only runs on leader
    try {
      while (!signal.aborted) {
        await setTimeout(periodicTriggerInterval, null, { signal })

        app.log.info('Executing periodic scaler trigger')
        try {
          await app.scalerExecutor.checkScalingOnMetrics()
        } catch (err) {
          app.log.error({ err }, 'Error during periodic trigger execution')
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        app.log.error({ err }, 'Error in periodic trigger loop')
        // Restart the loop after a short delay if not aborted
        if (!signal.aborted) {
          setTimeout(1000).then(() => {
            startPeriodicTrigger()
          })
        }
      }
    }
  }

  function stopPeriodicTrigger () {
    if (periodicTriggerController) {
      periodicTriggerController.abort()
      periodicTriggerController = null
      app.log.info('Stopped periodic scaler trigger')
    }
  }

  app.addHook('onClose', async () => {
    stopPeriodicTrigger()
  })

  app.decorate('startScalerTrigger', startPeriodicTrigger)
  app.decorate('stopScalerTrigger', stopPeriodicTrigger)
}

module.exports = fp(plugin, {
  name: 'scaler',
  dependencies: ['env', 'scaler-executor']
})
