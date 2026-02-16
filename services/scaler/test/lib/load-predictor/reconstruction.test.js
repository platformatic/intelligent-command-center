'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { reconstructMetrics } = require('../../../lib/load-predictor/reconstruction')

test('reconstructMetrics', async (t) => {
  await t.test('should handle empty stateByTimestamp', () => {
    const stateByTimestamp = []
    const podsCountHistory = [{ timestamp: 0, count: 2 }]

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    assert.strictEqual(stateByTimestamp.length, 0)
  })

  await t.test('should add reconstruction for single entry', () => {
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 50, i1: 30 }, count: 2 } }
    ]
    const podsCountHistory = [{ timestamp: 0, count: 2 }]

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    assert.ok(stateByTimestamp[0].reconstruction)
    assert.deepStrictEqual(stateByTimestamp[0].reconstruction.instances, { i0: 50, i1: 30 })
    assert.strictEqual(stateByTimestamp[0].reconstruction.rawSum, 80)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownCount, 0)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownValue, 0)
  })

  await t.test('should estimate unknown instances from previous tick', () => {
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 50, i1: 50 }, count: 2 } },
      { timestamp: 2000, aligned: { instances: { i0: 60 }, count: 1 } }
    ]
    const podsCountHistory = [{ timestamp: 0, count: 2 }]

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    // First tick: rawSum = 100, unknownCount = 0
    assert.strictEqual(stateByTimestamp[0].reconstruction.rawSum, 100)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownCount, 0)

    // Second tick: expectedPods = 2, known = 1, unknown = 1
    // prevTickSum = 100, i0 was in prev with value 50, estimatedSum = 100 - 50 = 50
    // unknownValue = 50 / 1 = 50
    // rawSum = 60 (i0) + 50 (estimated) = 110
    assert.strictEqual(stateByTimestamp[1].reconstruction.unknownCount, 1)
    assert.strictEqual(stateByTimestamp[1].reconstruction.unknownValue, 50)
    assert.strictEqual(stateByTimestamp[1].reconstruction.rawSum, 110)
  })

  await t.test('should use bootstrapState for estimation context', () => {
    // Bootstrap tick at index 0
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 50, i1: 50 }, count: 2 } },
      { timestamp: 2000, aligned: { instances: { i0: 70 }, count: 1 } }
    ]
    const podsCountHistory = [{ timestamp: 0, count: 2 }]
    const bootstrapState = { rawSum: 100 }

    reconstructMetrics(stateByTimestamp, podsCountHistory, bootstrapState)

    // First entry is bootstrap context, should not have reconstruction
    assert.strictEqual(stateByTimestamp[0].reconstruction, undefined)

    // Second entry should use bootstrap for estimation
    // prevTickSum = bootstrapState.rawSum = 100
    // i0 in prev tick with value 50, estimatedSum = 100 - 50 = 50
    // unknownValue = 50 / 1 = 50
    // rawSum = 70 + 50 = 120
    assert.ok(stateByTimestamp[1].reconstruction)
    assert.strictEqual(stateByTimestamp[1].reconstruction.unknownCount, 1)
    assert.strictEqual(stateByTimestamp[1].reconstruction.unknownValue, 50)
    assert.strictEqual(stateByTimestamp[1].reconstruction.rawSum, 120)
  })

  await t.test('should handle cold start (no bootstrap)', () => {
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 60 }, count: 1 } }
    ]
    const podsCountHistory = [{ timestamp: 0, count: 2 }]

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    // Cold start: no previous data, estimatedSum = 0
    // unknownCount = 2 - 1 = 1, but estimatedSum = 0
    // unknownValue = 0, rawSum = 60
    assert.ok(stateByTimestamp[0].reconstruction)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownCount, 1)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownValue, 0)
    assert.strictEqual(stateByTimestamp[0].reconstruction.rawSum, 60)
  })

  await t.test('should use max of known instances and expected from history', () => {
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 50 }, count: 1 } }
    ]
    const podsCountHistory = [] // Expected from history is 0

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    // With max(knownInstances, expected), we use 1 known instance even if history says 0
    // expectedPods = max(1, 0) = 1
    assert.ok(stateByTimestamp[0].reconstruction)
    assert.strictEqual(stateByTimestamp[0].reconstruction.rawSum, 50)
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownCount, 0)
  })

  await t.test('should handle pod count changes over time', () => {
    const stateByTimestamp = [
      { timestamp: 1000, aligned: { instances: { i0: 50 }, count: 1 } },
      { timestamp: 2000, aligned: { instances: { i0: 60, i1: 40 }, count: 2 } },
      { timestamp: 3000, aligned: { instances: { i0: 70, i1: 50 }, count: 2 } }
    ]
    const podsCountHistory = [
      { timestamp: 0, count: 1 },
      { timestamp: 1500, count: 2 }
    ]

    reconstructMetrics(stateByTimestamp, podsCountHistory, null)

    // t=1000: expected 1 pod, known 1, unknown 0
    assert.strictEqual(stateByTimestamp[0].reconstruction.unknownCount, 0)
    assert.strictEqual(stateByTimestamp[0].reconstruction.rawSum, 50)

    // t=2000: expected 2 pods, known 2, unknown 0
    assert.strictEqual(stateByTimestamp[1].reconstruction.unknownCount, 0)
    assert.strictEqual(stateByTimestamp[1].reconstruction.rawSum, 100)

    // t=3000: expected 2 pods, known 2, unknown 0
    assert.strictEqual(stateByTimestamp[2].reconstruction.unknownCount, 0)
    assert.strictEqual(stateByTimestamp[2].reconstruction.rawSum, 120)
  })
})
