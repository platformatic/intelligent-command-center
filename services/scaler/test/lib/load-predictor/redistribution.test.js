'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { redistributeSum } = require('../../../lib/load-predictor/redistribution')

const REDIST_MS = 5000

function weight (age, redistributionMs, k = 0.5) {
  const t = age / redistributionMs
  return (Math.exp(k * t) - 1) / (Math.exp(k) - 1)
}

function assertClose (actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${actual} to be close to ${expected}`
  )
}

test('redistributeSum', async (t) => {
  await t.test('empty stateByTimestamp', () => {
    const stateByTimestamp = []
    const instances = { i0: { podId: 'p0', startTime: 0, endTime: 10000 } }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    assert.strictEqual(stateByTimestamp.length, 0)
  })

  await t.test('all stable instances', () => {
    const stateByTimestamp = [
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100, i1: 80 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 80 }, unknownValue: 0, unknownCount: 0, rawSum: 180 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 0 },
      i1: { podId: 'p1', startTime: 0, endTime: 0 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    assert.strictEqual(stateByTimestamp[0].redistribution.value, 180)
    assert.strictEqual(stateByTimestamp[0].redistribution.count, 2)
  })

  await t.test('one stable and one new instance', () => {
    const stateByTimestamp = [
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100, i1: 50 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 50 }, unknownValue: 0, unknownCount: 0, rawSum: 150 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 10000 },
      i1: { podId: 'p1', startTime: 8000, endTime: 10000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // i0: age 10000 >= 5000 → stable, i1: age 2000 < 5000 → new
    const i1Weight = weight(2000, REDIST_MS)
    const baseShare = i1Weight
    const expectedSum = 100 + 50 * baseShare
    const expectedCount = 1 + 1 * baseShare

    assertClose(stateByTimestamp[0].redistribution.value, expectedSum)
    assertClose(stateByTimestamp[0].redistribution.count, expectedCount)
  })

  await t.test('all new instances', () => {
    const stateByTimestamp = [
      {
        timestamp: 10000,
        aligned: { instances: { i0: 60, i1: 40 }, count: 2 },
        reconstruction: { instances: { i0: 60, i1: 40 }, unknownValue: 0, unknownCount: 0, rawSum: 100 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 8000, endTime: 10000 },
      i1: { podId: 'p1', startTime: 9000, endTime: 10000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // i0: age 2000, i1: age 1000 → both new
    const i0Weight = weight(2000, REDIST_MS)
    const i1Weight = weight(1000, REDIST_MS)
    const baseShare = (i0Weight + i1Weight) / 2
    const total = 100
    const expectedSum = total * baseShare

    assertClose(stateByTimestamp[0].redistribution.value, expectedSum)
  })

  await t.test('prevSum clamping prevents sum from dropping', () => {
    const stateByTimestamp = [
      {
        timestamp: 8000,
        aligned: { instances: { i0: 100 }, count: 1 },
        reconstruction: { instances: { i0: 100 }, unknownValue: 0, unknownCount: 0, rawSum: 100 }
      },
      {
        timestamp: 9000,
        aligned: { instances: { i0: 100, i1: 10 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 10 }, unknownValue: 0, unknownCount: 0, rawSum: 110 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 9000 },
      i1: { podId: 'p1', startTime: 7000, endTime: 9000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // Tick 0: only i0 (stable), sum = 100, prevSum = 100
    assert.strictEqual(stateByTimestamp[0].redistribution.value, 100)

    // Tick 1: i0 stable (100), i1 new age=2000 (10)
    const i1Weight = weight(2000, REDIST_MS)
    const rawSum = 100 + 10 * i1Weight
    // rawSum ≈ 103.4 > 100, so no clamping needed here
    assertClose(stateByTimestamp[1].redistribution.value, rawSum)
  })

  await t.test('prevSum clamping activates when new instance lowers sum', () => {
    const stateByTimestamp = [
      {
        timestamp: 10000,
        aligned: { instances: { i0: 200 }, count: 1 },
        reconstruction: { instances: { i0: 200 }, unknownValue: 0, unknownCount: 0, rawSum: 200 }
      },
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100, i1: 20 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 20 }, unknownValue: 0, unknownCount: 0, rawSum: 120 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 10000 },
      i1: { podId: 'p1', startTime: 9500, endTime: 10000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // Tick 0: sum = 200, prevSum = 200
    assert.strictEqual(stateByTimestamp[0].redistribution.value, 200)

    // Tick 1: stableSum = 100, newVal = 20, i1 age=500, weight very small
    // rawSum ≈ 100 + 20 * weight(500) ≈ 101.6 < prevSum(200)
    // clamp to min(total=120, prevSum=200) = 120
    assert.strictEqual(stateByTimestamp[1].redistribution.value, 120)
  })

  await t.test('state continuation', () => {
    const stateByTimestamp1 = [
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100 }, count: 1 },
        reconstruction: { instances: { i0: 100 }, unknownValue: 0, unknownCount: 0, rawSum: 100 }
      }
    ]
    const instances = { i0: { podId: 'p0', startTime: 0, endTime: 11000 } }

    redistributeSum(stateByTimestamp1, instances, { redistributionMs: REDIST_MS }, null)

    const stateByTimestamp2 = [
      {
        timestamp: 11000,
        aligned: { instances: { i0: 120 }, count: 1 },
        reconstruction: { instances: { i0: 120 }, unknownValue: 0, unknownCount: 0, rawSum: 120 }
      }
    ]
    const bootstrapState = { prevSum: stateByTimestamp1[0].redistribution.prevSum }

    redistributeSum(stateByTimestamp2, instances, { redistributionMs: REDIST_MS }, bootstrapState)

    assert.strictEqual(stateByTimestamp2[0].redistribution.value, 120)
    assert.strictEqual(stateByTimestamp2[0].redistribution.prevSum, 120)
  })

  await t.test('multiple ticks with instance becoming stable', () => {
    const stateByTimestamp = [
      {
        timestamp: 8000,
        aligned: { instances: { i0: 100, i1: 50 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 50 }, unknownValue: 0, unknownCount: 0, rawSum: 150 }
      },
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100, i1: 50 }, count: 2 },
        reconstruction: { instances: { i0: 100, i1: 50 }, unknownValue: 0, unknownCount: 0, rawSum: 150 }
      }
    ]
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 10000 },
      i1: { podId: 'p1', startTime: 4000, endTime: 10000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // Tick 0: i1 age 4000 < 5000 → new
    const i1Weight0 = weight(4000, REDIST_MS)
    const expectedSum0 = 100 + 50 * i1Weight0
    assertClose(stateByTimestamp[0].redistribution.value, expectedSum0)

    // Tick 1: i1 age 6000 >= 5000 → stable
    assert.strictEqual(stateByTimestamp[1].redistribution.value, 150)
    assert.strictEqual(stateByTimestamp[1].redistribution.count, 2)
  })

  await t.test('unknown instances all stable', () => {
    const stateByTimestamp = [{
      timestamp: 10000,
      aligned: { instances: { i0: 100 }, count: 1 },
      reconstruction: {
        instances: { i0: 100 },
        unknownCount: 2,
        unknownValue: 30,
        rawSum: 160
      }
    }]
    const instances = { i0: { podId: 'p0', startTime: 0, endTime: 10000 } }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // i0 stable, no unmatched new instances → all unknowns are stable
    // stableSum = 100 + 2*30 = 160, stableCount = 3
    assert.strictEqual(stateByTimestamp[0].redistribution.value, 160)
    assert.strictEqual(stateByTimestamp[0].redistribution.count, 3)
  })

  await t.test('unknown instances filled by unmatched new', () => {
    const stateByTimestamp = [{
      timestamp: 10000,
      aligned: { instances: { i0: 100 }, count: 1 },
      reconstruction: {
        instances: { i0: 100 },
        unknownCount: 1,
        unknownValue: 50,
        rawSum: 150
      }
    }]
    // i0 is known in tick, i1 is NOT in tick instances → unmatched new
    const instances = {
      i0: { podId: 'p0', startTime: 0, endTime: 10000 },
      i1: { podId: 'p1', startTime: 8000, endTime: 10000 }
    }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // i0 stable (age 10000), i1 unmatched new (age 2000)
    // unknownNewCount = min(1, 1) = 1, unknownStableCount = 0
    // stableCount = 1, newCount = 1
    // stableSum = 100, total = 100 + 50 = 150, newVal = 50
    const i1Weight = weight(2000, REDIST_MS)
    const baseShare = i1Weight
    const expectedSum = 100 + 50 * baseShare
    const expectedCount = 1 + 1 * baseShare

    assertClose(stateByTimestamp[0].redistribution.value, expectedSum)
    assertClose(stateByTimestamp[0].redistribution.count, expectedCount)
  })

  await t.test('skips entries without reconstruction', () => {
    const stateByTimestamp = [
      {
        timestamp: 9000,
        aligned: { instances: { i0: 90 }, count: 1 }
        // No reconstruction - bootstrap tick
      },
      {
        timestamp: 10000,
        aligned: { instances: { i0: 100 }, count: 1 },
        reconstruction: { instances: { i0: 100 }, unknownValue: 0, unknownCount: 0, rawSum: 100 }
      }
    ]
    const instances = { i0: { podId: 'p0', startTime: 0, endTime: 10000 } }

    redistributeSum(stateByTimestamp, instances, { redistributionMs: REDIST_MS }, null)

    // First entry should not have redistribution
    assert.strictEqual(stateByTimestamp[0].redistribution, undefined)
    // Second entry should have redistribution
    assert.strictEqual(stateByTimestamp[1].redistribution.value, 100)
  })
})
