'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')

async function plugin (app) {
  let isServerClosed = false
  const periodicTriggerInterval = (Number(process.env.PLT_SCALER_PERIODIC_TRIGGER) || 60) * 1000
  let periodicTriggerController = null

  async function startPeriodicTrigger () {
    if ((periodicTriggerController && !periodicTriggerController.signal.aborted) || isServerClosed) {
      return
    }

    periodicTriggerController = new AbortController()
    const { signal } = periodicTriggerController

    app.log.info({ interval: periodicTriggerInterval }, 'Starting periodic scaler trigger')

    try {
      while (!signal.aborted) {
        try {
          await setTimeout(periodicTriggerInterval, null, { signal })
          if (!signal.aborted) {
            app.log.info('Executing periodic scaler trigger')
            try {
              await app.scalerExecutor.checkScalingOnMetrics()
            } catch (err) {
              app.log.error({ err }, 'Error during periodic trigger execution')
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            break
          }
          app.log.error({ err }, 'Error in periodic trigger loop, retrying after delay')
          try {
            await setTimeout(1000, null, { signal })
          } catch (delayErr) {
            if (delayErr.name === 'AbortError') {
              break
            }
            app.log.error({ err: delayErr }, 'Error in retry delay')
          }
        }
      }
    } catch (err) {
      app.log.error({ err }, 'Failed to start periodic scaler trigger')
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
