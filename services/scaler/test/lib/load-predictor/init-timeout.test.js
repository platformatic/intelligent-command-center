'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { calculateInitTimeout, median } = require('../../../lib/load-predictor/init-timeout')

const defaultConfig = {
  stepRate: 0.1,
  upFactor: 1.5,
  downFactor: 1.0
}

test('median', async (t) => {
  await t.test('odd number of values', () => {
    assert.strictEqual(median([3, 1, 2]), 2)
    assert.strictEqual(median([5, 1, 9, 3, 7]), 5)
  })

  await t.test('even number of values', () => {
    assert.strictEqual(median([1, 3]), 2)
    assert.strictEqual(median([1, 2, 3, 4]), 2.5)
  })

  await t.test('single value', () => {
    assert.strictEqual(median([42]), 42)
  })

  await t.test('does not mutate input', () => {
    const input = [3, 1, 2]
    median(input)
    assert.deepStrictEqual(input, [3, 1, 2])
  })
})

test('calculateInitTimeout', async (t) => {
  await t.test('converges from seed toward stable measurements', () => {
    let timeout = 1000

    // Window fills up with measurements around 800
    timeout = calculateInitTimeout([820], timeout, defaultConfig)
    assert.strictEqual(timeout, 900) // capped at -100 (10% down)

    timeout = calculateInitTimeout([820, 790], timeout, defaultConfig)
    assert.strictEqual(timeout, 810) // median=805, delta=-95, capped at -90

    timeout = calculateInitTimeout([820, 790, 810], timeout, defaultConfig)
    assert.strictEqual(timeout, 810) // median=810, delta=0
  })

  await t.test('single high outlier has near-zero impact', () => {
    const timeout = 810

    // Window with one outlier among normal values
    const result = calculateInitTimeout([790, 810, 820, 5000], timeout, defaultConfig)
    // median of [790, 810, 820, 5000] = (810+820)/2 = 815
    assert.strictEqual(result, 815) // only +5ms shift
  })

  await t.test('single low outlier has near-zero impact', () => {
    const timeout = 810

    const result = calculateInitTimeout([50, 790, 810, 820], timeout, defaultConfig)
    // median of [50, 790, 810, 820] = (790+810)/2 = 800
    assert.strictEqual(result, 800) // only -10ms shift
  })

  await t.test('two outliers in window of 5 have no impact', () => {
    const timeout = 810

    const result = calculateInitTimeout([800, 5000, 810, 5000, 820], timeout, defaultConfig)
    // sorted: [800, 810, 820, 5000, 5000], median = 820
    assert.strictEqual(result, 820) // only +10ms, outliers filtered
  })

  await t.test('rate limits upward steps', () => {
    const timeout = 810

    // Median tips to 1180 (3 of 5 values are high)
    const result = calculateInitTimeout([805, 810, 1180, 1200, 1210], timeout, defaultConfig)
    // median = 1180, delta = 370, maxUp = 810 * 0.1 * 1.5 = 121.5
    assert.strictEqual(result, 932) // capped at +121.5, rounded
  })

  await t.test('rate limits downward steps', () => {
    const timeout = 1200

    const result = calculateInitTimeout([805, 810, 815, 820, 1200], timeout, defaultConfig)
    // median = 815, delta = -385, maxDown = 1200 * 0.1 * 1.0 = 120
    assert.strictEqual(result, 1080) // capped at -120
  })

  await t.test('upward steps are faster than downward', () => {
    // Same absolute delta, different direction
    const upResult = calculateInitTimeout([1500], 1000, defaultConfig)
    const downResult = calculateInitTimeout([500], 1000, defaultConfig)

    const upDelta = upResult - 1000 // +150 (capped by 1000 * 0.1 * 1.5)
    const downDelta = 1000 - downResult // +100 (capped by 1000 * 0.1 * 1.0)

    assert.ok(upDelta > downDelta, `up delta ${upDelta} should be > down delta ${downDelta}`)
    assert.strictEqual(upResult, 1150)
    assert.strictEqual(downResult, 900)
  })

  await t.test('app update: gradual convergence from 810 to 1200', () => {
    let timeout = 810
    const config = defaultConfig

    // Step 1-2: 1 and 2 new values, old values dominate median
    timeout = calculateInitTimeout([800, 805, 810, 815, 1200], timeout, config)
    assert.strictEqual(timeout, 810) // median=810, no change

    timeout = calculateInitTimeout([805, 810, 1180, 1200, 1200], timeout, config)
    // sorted: [805, 810, 1180, 1200, 1200], median = 1180
    // delta = 370, maxUp = 810 * 0.15 = 121.5
    assert.strictEqual(timeout, 932)

    // Actually let me trace this properly with FIFO window
    // After old window [795, 815, 800, 810, 805], timeout = 810

    // Step 13: 3 new values tip the median
    timeout = 810
    timeout = calculateInitTimeout([810, 805, 1200, 1180, 1210], timeout, config)
    // sorted: [805, 810, 1180, 1200, 1210], median = 1180
    // delta = 370, maxUp = 810 * 0.15 = 121.5
    assert.strictEqual(timeout, 932)

    timeout = calculateInitTimeout([805, 1200, 1180, 1210, 1195], timeout, config)
    // sorted: [805, 1180, 1195, 1200, 1210], median = 1195
    // delta = 263, maxUp = 932 * 0.15 = 139.8
    assert.strictEqual(timeout, 1072)

    timeout = calculateInitTimeout([1200, 1180, 1210, 1195, 1220], timeout, config)
    // sorted: [1180, 1195, 1200, 1210, 1220], median = 1200
    // delta = 128, maxUp = 1072 * 0.15 = 160.8
    assert.strictEqual(timeout, 1200) // converged
  })

  await t.test('no change when measurement matches current timeout', () => {
    const result = calculateInitTimeout([1000, 1000, 1000], 1000, defaultConfig)
    assert.strictEqual(result, 1000)
  })

  await t.test('works with custom config', () => {
    const config = { stepRate: 0.2, upFactor: 1.0, downFactor: 1.0 }
    const result = calculateInitTimeout([2000], 1000, config)
    // delta = 1000, maxUp = 1000 * 0.2 * 1.0 = 200
    assert.strictEqual(result, 1200)
  })
})
