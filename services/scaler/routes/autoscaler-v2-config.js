'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/applications/:applicationId/autoscaler-v2-config', {
    schema: {
      operationId: 'getAutoscalerV2Config',
      params: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId']
      }
    },
    handler: async (req) => {
      const { applicationId } = req.params
      const scaleConfig = await app.getScaleConfig(applicationId)

      const valueFromEnv = key => app.env[key]
      const createEntry = key => ({ key, value: valueFromEnv(key) })
      const createSection = (id, title, keys) => ({
        id,
        title,
        entries: keys.map(createEntry)
      })

      const sections = [createSection(
        'loadpredictor-global',
        'LoadPredictor - Global config',
        [
          'PLT_SIGNALS_SCALER_RECONNECT_TIMEOUT_MS',
          'PLT_SIGNALS_SCALER_READINESS_DELAY_MS',
          'PLT_SIGNALS_SCALER_HORIZONTAL_TREND_THRESHOLD',
          'PLT_SIGNALS_SCALER_PENDING_SCALE_UP_EXPIRY_MS',
          'PLT_SIGNALS_SCALER_REDEPLOY_TIMEOUT_MS',
          'PLT_SIGNALS_SCALER_INIT_TIMEOUT_MS',
          'PLT_SIGNALS_SCALER_HORIZON_MULTIPLIER',
          'PLT_SIGNALS_SCALER_MIN_HORIZON_MS',
          'PLT_SIGNALS_SCALER_MAX_HORIZON_MS'
        ]
      ), createSection(
        'loadpredictor-init-timeout',
        'LoadPredictor - Init timeout tuning',
        [
          'PLT_SIGNALS_SCALER_INIT_TIMEOUT_WINDOW_SIZE',
          'PLT_SIGNALS_SCALER_INIT_TIMEOUT_STEP_RATE',
          'PLT_SIGNALS_SCALER_INIT_TIMEOUT_UP_FACTOR',
          'PLT_SIGNALS_SCALER_INIT_TIMEOUT_DOWN_FACTOR'
        ]
      ), createSection(
        'loadpredictor-scaling-decision',
        'LoadPredictor - Scaling decision parameters',
        [
          'PLT_SIGNALS_SCALER_SCALE_UP_K',
          'PLT_SIGNALS_SCALER_SCALE_UP_MARGIN',
          'PLT_SIGNALS_SCALER_SCALE_DOWN_MARGIN'
        ]
      ), {
        id: 'loadpredictor-default-app',
        title: 'LoadPredictor - Default app config',
        entries: [
          { key: 'PLT_SCALER_MIN_PODS_DEFAULT', value: scaleConfig?.minPods ?? valueFromEnv('PLT_SCALER_MIN_PODS_DEFAULT') },
          { key: 'PLT_SCALER_MAX_PODS_DEFAULT', value: scaleConfig?.maxPods ?? valueFromEnv('PLT_SCALER_MAX_PODS_DEFAULT') },
          { key: 'PLT_SIGNALS_SCALER_MAX_SCALE_UP_STEP', value: valueFromEnv('PLT_SIGNALS_SCALER_MAX_SCALE_UP_STEP') },
          { key: 'PLT_SIGNALS_SCALER_PROCESSING_INIT_TIMEOUT_MS', value: valueFromEnv('PLT_SIGNALS_SCALER_PROCESSING_INIT_TIMEOUT_MS') },
          { key: 'PLT_SIGNALS_SCALER_PROCESSING_COOLDOWN_MS', value: valueFromEnv('PLT_SIGNALS_SCALER_PROCESSING_COOLDOWN_MS') },
          { key: 'PLT_SIGNALS_SCALER_INSTANCES_WINDOW_MS', value: valueFromEnv('PLT_SIGNALS_SCALER_INSTANCES_WINDOW_MS') }
        ]
      }, createSection(
        'loadpredictor-cooldowns',
        'LoadPredictor - Cooldowns',
        [
          'PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_UP_MS',
          'PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_DOWN_MS',
          'PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_UP_MS',
          'PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_DOWN_MS'
        ]
      ), createSection(
        'loadpredictor-elu',
        'LoadPredictor - ELU config',
        [
          'PLT_SIGNALS_SCALER_ELU_WINDOW_MS',
          'PLT_SIGNALS_SCALER_ELU_SAMPLE_INTERVAL',
          'PLT_SIGNALS_SCALER_ELU_REDISTRIBUTION_MS',
          'PLT_SIGNALS_SCALER_ELU_ALPHA_UP',
          'PLT_SIGNALS_SCALER_ELU_ALPHA_DOWN',
          'PLT_SIGNALS_SCALER_ELU_BETA_UP',
          'PLT_SIGNALS_SCALER_ELU_BETA_DOWN'
        ]
      ), createSection(
        'loadpredictor-heap',
        'LoadPredictor - Heap config',
        [
          'PLT_SIGNALS_SCALER_HEAP_WINDOW_MS',
          'PLT_SIGNALS_SCALER_HEAP_SAMPLE_INTERVAL',
          'PLT_SIGNALS_SCALER_HEAP_REDISTRIBUTION_MS',
          'PLT_SIGNALS_SCALER_HEAP_ALPHA_UP',
          'PLT_SIGNALS_SCALER_HEAP_ALPHA_DOWN',
          'PLT_SIGNALS_SCALER_HEAP_BETA_UP',
          'PLT_SIGNALS_SCALER_HEAP_BETA_DOWN'
        ]
      )]

      return {
        applicationId,
        sections
      }
    }
  })
}
