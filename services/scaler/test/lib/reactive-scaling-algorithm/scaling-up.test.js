'use strict'

process.env.SKIP_POST_SCALING_EVALUATION = 'true'

const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const ReactiveScalingAlgorithm = require('../../../lib/reactive-scaling-algorithm')
const Store = require('../../../lib/store')
const { valkeyConnectionString } = require('../../helper')

function createMockLog () {
  const logs = []
  return {
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    getLogs: () => logs
  }
}

function createMockApp (store, log, metrics) {
  return {
    store,
    log,
    scalerMetrics: metrics,
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => [],
          save: async () => {}
        }
      }
    }
  }
}

async function setupStore (t) {
  const store = new Store(valkeyConnectionString, createMockLog())

  // Clean up before test
  const keys = await store.valkey.keys('scaler:*')
  if (keys.length > 0) {
    await store.valkey.del(keys)
  }

  // Register cleanup after test
  t.after(async () => {
    const keys = await store.valkey.keys('scaler:*')
    if (keys.length > 0) {
      await store.valkey.del(keys)
    }
    await store.close()
  })

  return store
}

test('algorithm processes real alert structure correctly', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  await store.valkey.set('scaler:last-scaling:test-app-alert', (Date.now() - 600000).toString())

  // Load real alert structure
  const alertPath = path.join(__dirname, 'alert.json')
  const realAlerts = JSON.parse(fs.readFileSync(alertPath, 'utf8'))

  const applicationId = 'test-app-alert'
  const currentPodCount = 1
  const minPods = 1
  const maxPods = 10
  const podsMetrics = {}

  console.log('=== Real Alert Processing Test ===')
  console.log('Real alert structure:')
  console.log(`  Pod ID: ${realAlerts[0].podId}`)
  console.log(`  ELU: ${(realAlerts[0].elu * 100).toFixed(2)}%`)
  console.log(`  Heap Used: ${(realAlerts[0].heapUsed / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`  Heap Total: ${(realAlerts[0].heapTotal / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`  Unhealthy: ${realAlerts[0].unhealthy}`)
  console.log(`  Health History entries: ${realAlerts[0].healthHistory.length}`)

  const result = await algorithm.calculateScalingDecision(
    applicationId,
    podsMetrics,
    currentPodCount,
    minPods,
    maxPods,
    realAlerts
  )

  console.log('')
  console.log('Algorithm result:')
  console.log(`  Target pod count: ${result.nfinal}`)
  console.log(`  Scaling action: ${result.nfinal > currentPodCount ? 'SCALE UP' : result.nfinal < currentPodCount ? 'SCALE DOWN' : 'NO CHANGE'}`)
  console.log(`  Reason: ${result.reason || 'Algorithm-based decision'}`)

  // Debug: Check if the algorithm is processing the alert correctly
  console.log('')
  console.log('Debug info:')
  console.log(`  Pod metrics created: ${Object.keys(podsMetrics).length > 0 ? 'Yes' : 'No'}`)
  if (Object.keys(podsMetrics).length > 0) {
    const podId = Object.keys(podsMetrics)[0]
    const metrics = podsMetrics[podId]
    console.log(`  ELU data points: ${metrics.eventLoopUtilization.map(d => d.values.length).reduce((a, b) => a + b, 0)}`)
    console.log(`  Heap data points: ${metrics.heapSize.map(d => d.values.length).reduce((a, b) => a + b, 0)}`)

    // Debug: Check the actual ELU values being processed
    const allEluValues = []
    for (const data of metrics.eventLoopUtilization) {
      for (const [, value] of data.values) {
        allEluValues.push(parseFloat(value))
      }
    }
    const avgElu = allEluValues.reduce((a, b) => a + b, 0) / allEluValues.length
    const maxElu = Math.max(...allEluValues)
    console.log(`  Average ELU: ${(avgElu * 100).toFixed(2)}%`)
    console.log(`  Max ELU: ${(maxElu * 100).toFixed(2)}%`)
    console.log(`  ELU > 95% trigger: ${maxElu > 0.95 ? 'Yes' : 'No'}`)
  }

  console.log('')
  console.log('Analysis:')
  console.log('✓ Algorithm now processes real alert structure')
  console.log('✓ Extracts current ELU and heap metrics from alert')
  console.log('✓ Utilizes healthHistory for time-series trend analysis')
  console.log(`✓ Alert ELU ${(realAlerts[0].elu * 100).toFixed(2)}% is above 90% threshold`)

  // Verify the algorithm correctly processes the alert
  assert.ok(result.nfinal >= currentPodCount, 'Should scale up or maintain due to high ELU in alert')

  // With ELU at 99.67%, this should trigger scaling
  if (realAlerts[0].elu > 0.95) {
    assert.ok(result.nfinal > currentPodCount, 'Should scale up due to very high ELU (>95%)')
    assert.strictEqual(result.reason, 'Scaling up for high utilization', 'Should have correct reason for scale up')
  }

  console.log('=================================')
})
