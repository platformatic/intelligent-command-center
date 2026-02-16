'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { alignInstanceMetrics, alignWorkerSamples, aggregateWorkers } = require('../../../lib/load-predictor/alignment')

// Helper to convert sample objects to workers format
function toWorkers (samples, workerId = 'default') {
  return {
    [workerId]: {
      values: samples.map(s => [s.timestamp, s.value])
    }
  }
}

// Helper to convert multi-worker samples to workers format
function toMultiWorkers (samples) {
  const workers = {}
  for (const s of samples) {
    const wid = s.workerId || 'default'
    if (!workers[wid]) workers[wid] = { values: [] }
    workers[wid].values.push([s.timestamp, s.value])
  }
  return workers
}

test('alignInstanceMetrics', async (t) => {
  await t.test('should return anchor for single sample without lastSample', () => {
    const workers = toWorkers([{ timestamp: 1500, value: 50 }])
    const { aligned, lastSample } = alignInstanceMetrics(workers, null, 1000)

    // Without lastSample, single sample creates anchor at floored grid timestamp
    // floor(1500/1000)*1000 = 1000
    assert.strictEqual(aligned.length, 1)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 50)
    assert.deepStrictEqual(lastSample, { timestamp: 1500, value: 50 })
  })

  await t.test('should return empty array for empty workers', () => {
    const { aligned, lastSample } = alignInstanceMetrics({}, null, 1000)
    assert.deepStrictEqual(aligned, [])
    assert.strictEqual(lastSample, null)
  })

  await t.test('should align samples to grid intervals', () => {
    const workers = toWorkers([
      { timestamp: 1000, value: 0 },
      { timestamp: 3000, value: 100 }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 1000)

    // startTimestamp = floor(1000/1000)*1000 = 1000
    // endTimestamp = floor(3000/1000)*1000 + 1000 = 4000
    // So we get timestamps: 1000, 2000, 3000
    assert.strictEqual(aligned.length, 3)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 0)
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 50)
    assert.strictEqual(aligned[2].timestamp, 3000)
    assert.strictEqual(aligned[2].value, 100)
  })

  await t.test('should use lastSample for continuity and cover gap', () => {
    const lastSample = { timestamp: 1000, value: 0 }
    const workers = toWorkers([
      { timestamp: 2000, value: 100 }
    ])
    const { aligned } = alignInstanceMetrics(workers, lastSample, 500)

    // startTimestamp = floor(1000/500)*500 + 500 = 1500 (next aligned after lastSample)
    // endTimestamp = floor(2000/500)*500 + 500 = 2500
    // Gap coverage: ts=1500 and ts=2000
    assert.strictEqual(aligned.length, 2)
    assert.strictEqual(aligned[0].timestamp, 1500)
    assert.strictEqual(aligned[0].value, 50)
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 100)
  })

  await t.test('should handle exact timestamp match', () => {
    const workers = toWorkers([
      { timestamp: 1000, value: 50 },
      { timestamp: 2000, value: 80 }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 1000)

    // startTimestamp = 1000, endTimestamp = 3000
    // Timestamps: 1000, 2000
    assert.strictEqual(aligned.length, 2)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 50)
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 80)
  })

  await t.test('should interpolate linearly between samples', () => {
    const workers = toWorkers([
      { timestamp: 1000, value: 0 },
      { timestamp: 2000, value: 100 }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 250)

    // Verify linear interpolation at quarter points
    assert.strictEqual(aligned.length, 5)
    assert.strictEqual(aligned[0].value, 0)
    assert.strictEqual(aligned[1].value, 25)
    assert.strictEqual(aligned[2].value, 50)
    assert.strictEqual(aligned[3].value, 75)
    assert.strictEqual(aligned[4].value, 100)
  })

  await t.test('should produce same timestamps for instances with different random shifts', () => {
    const sampleInterval = 7000
    const numInstances = 5
    const numSamples = 10
    // Use a fixed base timestamp aligned to the grid to avoid boundary effects
    const now = 1000000

    // Same lastSample for all instances (simulates previous batch ending at same time)
    const lastSample = { timestamp: now, value: 50 }

    // Fixed end time for all instances well past the last grid point
    const batchEndTime = now + sampleInterval * numSamples + sampleInterval / 2

    // Deterministic offsets and jitter per instance
    const startOffsets = [1200, 3500, 500, 6800, 4100]
    const jitters = [
      [-200, 100, -400, 300, -100, 200, -300, 400],
      [300, -100, 200, -400, 100, -200, 400, -300],
      [-400, 300, -100, 200, -300, 400, -200, 100],
      [100, -300, 400, -200, 300, -400, 200, -100],
      [200, -400, 300, -100, 400, -300, 100, -200]
    ]
    const endJitters = [400, -300, 200, -100, 300]
    const values = [30, 55, 72, 18, 90, 45, 63, 27, 81, 10]

    // Generate samples for each instance with deterministic offsets and jitter
    const instanceWorkers = []
    for (let i = 0; i < numInstances; i++) {
      const samples = []

      let timestamp = now + startOffsets[i]
      for (let j = 0; j < numSamples - 1; j++) {
        samples.push({ timestamp, value: values[j] })
        timestamp += sampleInterval + jitters[i][j % jitters[i].length]
      }
      samples.push({ timestamp: batchEndTime + endJitters[i], value: values[numSamples - 1] })
      instanceWorkers.push(toWorkers(samples))
    }

    // Align each instance's samples independently with the same lastSample
    const alignedResults = instanceWorkers.map(workers =>
      alignInstanceMetrics(workers, lastSample, sampleInterval).aligned
    )

    // All instances should have the same number of results
    const expectedLength = alignedResults[0].length
    assert.ok(expectedLength > 0, 'Should have aligned results')
    for (let i = 1; i < numInstances; i++) {
      assert.strictEqual(
        alignedResults[i].length,
        expectedLength,
        `Instance ${i} should have same number of results as instance 0`
      )
    }

    // Verify timestamps are equal across all instances
    const referenceTimestamps = alignedResults[0].map(p => p.timestamp)
    for (let i = 1; i < numInstances; i++) {
      const instanceTimestamps = alignedResults[i].map(p => p.timestamp)
      assert.deepStrictEqual(
        instanceTimestamps,
        referenceTimestamps,
        `Instance ${i} timestamps should match instance 0`
      )
    }

    // Verify distance between each timestamp is exactly sampleInterval
    for (let i = 1; i < referenceTimestamps.length; i++) {
      const distance = referenceTimestamps[i] - referenceTimestamps[i - 1]
      assert.strictEqual(
        distance,
        sampleInterval,
        `Distance between timestamp ${i - 1} and ${i} should be ${sampleInterval}`
      )
    }

    // Verify timestamps are on the grid
    for (const ts of referenceTimestamps) {
      assert.strictEqual(ts % sampleInterval, 0, `Timestamp ${ts} should be aligned to grid`)
    }
  })

  await t.test('should handle consecutive single-sample batches', () => {
    const sampleInterval = 1000

    // Batch 1: single sample, no lastSample - returns anchor point
    const batch1Workers = toWorkers([{ timestamp: 1500, value: 10 }])
    const { aligned: result1, lastSample: lastSample1 } = alignInstanceMetrics(batch1Workers, null, sampleInterval)

    // Anchor at floor(1500/1000)*1000 = 1000
    assert.strictEqual(result1.length, 1)
    assert.strictEqual(result1[0].timestamp, 1000)
    assert.strictEqual(result1[0].value, 10)

    // Use lastSample1 for next round
    const savedLastSample = lastSample1

    // Batch 2: single sample, with lastSample - can now interpolate
    const batch2Workers = toWorkers([{ timestamp: 4500, value: 40 }])
    const { aligned: result2 } = alignInstanceMetrics(batch2Workers, savedLastSample, sampleInterval)

    // Should produce aligned points between 1500 and 4500
    // startTimestamp = floor(1500/1000)*1000 + 1000 = 2000
    assert.strictEqual(result2.length, 3)
    assert.strictEqual(result2[0].timestamp, 2000)
    assert.strictEqual(result2[1].timestamp, 3000)
    assert.strictEqual(result2[2].timestamp, 4000)

    // Values should be linearly interpolated
    // From 10 at 1500 to 40 at 4500 (span of 3000ms, delta of 30)
    assert.strictEqual(result2[0].value, 15) // 10 + 30 * (500/3000)
    assert.strictEqual(result2[1].value, 25) // 10 + 30 * (1500/3000)
    assert.strictEqual(result2[2].value, 35) // 10 + 30 * (2500/3000)
  })

  await t.test('should fill gaps with lastSample and single sample (5x interval)', () => {
    const sampleInterval = 1000
    const lastSample = { timestamp: 1000, value: 0 }
    const workers = toWorkers([
      { timestamp: 6000, value: 100 } // 5 intervals away
    ])

    const { aligned } = alignInstanceMetrics(workers, lastSample, sampleInterval)

    // startTimestamp = floor(1000/1000)*1000 + 1000 = 2000 (next aligned after lastSample)
    // endTimestamp = 6000 + 1000 = 7000
    // Should produce: 2000, 3000, 4000, 5000, 6000
    assert.strictEqual(aligned.length, 5)

    // Verify timestamps
    assert.strictEqual(aligned[0].timestamp, 2000)
    assert.strictEqual(aligned[1].timestamp, 3000)
    assert.strictEqual(aligned[2].timestamp, 4000)
    assert.strictEqual(aligned[3].timestamp, 5000)
    assert.strictEqual(aligned[4].timestamp, 6000)

    // Verify linear interpolation: 0 at 1000, 100 at 6000
    // value = 0 + (100 - 0) * (ts - 1000) / (6000 - 1000)
    assert.strictEqual(aligned[0].value, 20) // (2000 - 1000) / 5000 * 100 = 20
    assert.strictEqual(aligned[1].value, 40) // (3000 - 1000) / 5000 * 100 = 40
    assert.strictEqual(aligned[2].value, 60) // (4000 - 1000) / 5000 * 100 = 60
    assert.strictEqual(aligned[3].value, 80) // (5000 - 1000) / 5000 * 100 = 80
    assert.strictEqual(aligned[4].value, 100) // exact match at 6000
  })

  await t.test('should reconstruct gaps when samples are sparse (3x interval)', () => {
    const sampleInterval = 1000
    const sparseFactor = 3
    const numSamples = 5
    const now = Date.now()

    // lastSample at a grid-aligned time
    const lastSampleTime = Math.floor(now / sampleInterval) * sampleInterval
    const lastSample = { timestamp: lastSampleTime, value: 0 }

    // Generate sparse samples: every 3 * sampleInterval + random shift
    const samples = []
    let timestamp = lastSampleTime
    for (let i = 0; i < numSamples; i++) {
      const jitter = Math.floor(Math.random() * 500) - 250
      timestamp += sparseFactor * sampleInterval + jitter
      samples.push({ timestamp, value: (i + 1) * 100 })
    }

    const workers = toWorkers(samples)
    const { aligned } = alignInstanceMetrics(workers, lastSample, sampleInterval)

    // Should have aligned points covering the full range
    // From lastSample to last sample: approximately numSamples * 3 intervals
    assert.ok(aligned.length > 0, 'Should have aligned results')

    // Verify all timestamps are on the grid
    for (const point of aligned) {
      assert.strictEqual(
        point.timestamp % sampleInterval,
        0,
        `Timestamp ${point.timestamp} should be aligned to grid`
      )
    }

    // Verify distance between each timestamp is exactly sampleInterval
    for (let i = 1; i < aligned.length; i++) {
      const distance = aligned[i].timestamp - aligned[i - 1].timestamp
      assert.strictEqual(
        distance,
        sampleInterval,
        `Distance between timestamp ${i - 1} and ${i} should be ${sampleInterval}`
      )
    }

    // Verify values are interpolated (should be monotonically increasing)
    for (let i = 1; i < aligned.length; i++) {
      assert.ok(
        aligned[i].value >= aligned[i - 1].value,
        `Value at ${i} should be >= value at ${i - 1}`
      )
    }

    // Verify first aligned timestamp starts after lastSample
    assert.strictEqual(
      aligned[0].timestamp,
      lastSampleTime + sampleInterval,
      'First aligned timestamp should be one interval after lastSample'
    )

    // Verify we have approximately the expected number of aligned points
    // (numSamples * sparseFactor intervals from lastSample to last sample)
    const expectedMinLength = (numSamples - 1) * sparseFactor
    assert.ok(
      aligned.length >= expectedMinLength,
      `Should have at least ${expectedMinLength} aligned points, got ${aligned.length}`
    )
  })

  await t.test('should handle multiple workers and take max at each timestamp', () => {
    const workers = toMultiWorkers([
      { timestamp: 1000, value: 10, workerId: 'w1' },
      { timestamp: 2000, value: 20, workerId: 'w1' },
      { timestamp: 1000, value: 15, workerId: 'w2' },
      { timestamp: 2000, value: 25, workerId: 'w2' }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 1000)

    assert.strictEqual(aligned.length, 2)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 15) // max(10, 15)
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 25) // max(20, 25)
  })

  await t.test('should handle workers with different timestamp ranges', () => {
    const workers = toMultiWorkers([
      { timestamp: 2000, value: 20, workerId: 'w1' },
      { timestamp: 3000, value: 30, workerId: 'w1' },
      { timestamp: 1000, value: 10, workerId: 'w2' },
      { timestamp: 2000, value: 25, workerId: 'w2' }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 1000)

    // w1: [2000, 3000], w2: [1000, 2000]
    // merged: [1000, 2000, 3000]
    assert.strictEqual(aligned.length, 3)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 10) // only w2
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 25) // max(20, 25)
    assert.strictEqual(aligned[2].timestamp, 3000)
    assert.strictEqual(aligned[2].value, 30) // only w1
  })

  await t.test('should interpolate each worker separately before taking max', () => {
    const workers = toMultiWorkers([
      { timestamp: 1000, value: 0, workerId: 'w1' },
      { timestamp: 3000, value: 100, workerId: 'w1' },
      { timestamp: 1000, value: 100, workerId: 'w2' },
      { timestamp: 3000, value: 0, workerId: 'w2' }
    ])
    const { aligned } = alignInstanceMetrics(workers, null, 1000)

    // w1: 0 -> 50 -> 100
    // w2: 100 -> 50 -> 0
    // max: 100, 50, 100
    assert.strictEqual(aligned.length, 3)
    assert.strictEqual(aligned[0].timestamp, 1000)
    assert.strictEqual(aligned[0].value, 100) // max(0, 100)
    assert.strictEqual(aligned[1].timestamp, 2000)
    assert.strictEqual(aligned[1].value, 50) // max(50, 50)
    assert.strictEqual(aligned[2].timestamp, 3000)
    assert.strictEqual(aligned[2].value, 100) // max(100, 0)
  })
})

test('alignWorkerSamples', async (t) => {
  await t.test('should return empty array for empty samples', () => {
    const result = alignWorkerSamples([], null, 1000)
    assert.deepStrictEqual(result, [])
  })

  await t.test('should create anchor for single sample without prev', () => {
    const samples = [[1500, 50]]
    const result = alignWorkerSamples(samples, null, 1000)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[0].value, 50)
  })

  await t.test('should interpolate between prev and samples', () => {
    const prev = { timestamp: 1000, value: 0 }
    const samples = [[2000, 100]]
    const result = alignWorkerSamples(samples, prev, 500)

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].timestamp, 1500)
    assert.strictEqual(result[0].value, 50)
    assert.strictEqual(result[1].timestamp, 2000)
    assert.strictEqual(result[1].value, 100)
  })

  await t.test('should handle multiple samples', () => {
    const samples = [
      [1000, 0],
      [2000, 50],
      [3000, 100]
    ]
    const result = alignWorkerSamples(samples, null, 1000)

    assert.strictEqual(result.length, 3)
    assert.strictEqual(result[0].value, 0)
    assert.strictEqual(result[1].value, 50)
    assert.strictEqual(result[2].value, 100)
  })

  await t.test('should align timestamps to grid', () => {
    const samples = [
      [1100, 10],
      [2900, 90]
    ]
    const result = alignWorkerSamples(samples, null, 1000)

    // Anchor at floor(1100/1000)*1000 = 1000
    // Then interpolate to 2000
    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[1].timestamp, 2000)
  })
})

test('aggregateWorkers', async (t) => {
  await t.test('should return empty array for empty input', () => {
    const result = aggregateWorkers([])
    assert.deepStrictEqual(result, [])
  })

  await t.test('should return single array unchanged', () => {
    const aligned = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 20 }
    ]
    const result = aggregateWorkers([aligned])
    assert.deepStrictEqual(result, aligned)
  })

  await t.test('should take max at each timestamp', () => {
    const w1 = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 30 }
    ]
    const w2 = [
      { timestamp: 1000, value: 20 },
      { timestamp: 2000, value: 25 }
    ]
    const result = aggregateWorkers([w1, w2])

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[0].value, 20) // max(10, 20)
    assert.strictEqual(result[1].timestamp, 2000)
    assert.strictEqual(result[1].value, 30) // max(30, 25)
  })

  await t.test('should merge arrays with different ranges', () => {
    const w1 = [
      { timestamp: 2000, value: 20 },
      { timestamp: 3000, value: 30 }
    ]
    const w2 = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 25 }
    ]
    const result = aggregateWorkers([w1, w2])

    assert.strictEqual(result.length, 3)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[0].value, 10)
    assert.strictEqual(result[1].timestamp, 2000)
    assert.strictEqual(result[1].value, 25) // max(20, 25)
    assert.strictEqual(result[2].timestamp, 3000)
    assert.strictEqual(result[2].value, 30)
  })

  await t.test('should handle three or more workers', () => {
    const w1 = [{ timestamp: 1000, value: 10 }, { timestamp: 2000, value: 20 }]
    const w2 = [{ timestamp: 1000, value: 15 }, { timestamp: 2000, value: 15 }]
    const w3 = [{ timestamp: 1000, value: 5 }, { timestamp: 2000, value: 30 }]
    const result = aggregateWorkers([w1, w2, w3])

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].value, 15) // max(10, 15, 5)
    assert.strictEqual(result[1].value, 30) // max(20, 15, 30)
  })

  await t.test('should produce sorted output', () => {
    const w1 = [{ timestamp: 3000, value: 30 }, { timestamp: 4000, value: 40 }]
    const w2 = [{ timestamp: 1000, value: 10 }, { timestamp: 2000, value: 20 }]
    const result = aggregateWorkers([w1, w2])

    assert.strictEqual(result.length, 4)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[1].timestamp, 2000)
    assert.strictEqual(result[2].timestamp, 3000)
    assert.strictEqual(result[3].timestamp, 4000)
  })

  await t.test('should handle non-overlapping ranges', () => {
    const w1 = [{ timestamp: 1000, value: 10 }, { timestamp: 2000, value: 20 }]
    const w2 = [{ timestamp: 5000, value: 50 }, { timestamp: 6000, value: 60 }]
    const result = aggregateWorkers([w1, w2])

    assert.strictEqual(result.length, 4)
    assert.strictEqual(result[0].timestamp, 1000)
    assert.strictEqual(result[1].timestamp, 2000)
    assert.strictEqual(result[2].timestamp, 5000)
    assert.strictEqual(result[3].timestamp, 6000)
  })
})
