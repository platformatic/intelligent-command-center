'use strict'

// workers format: { workerId: { values: [[timestamp, value], ...] } }
// returns: { aligned: [{ timestamp, value }, ...], lastSample: { timestamp, value } | null }
function alignInstanceMetrics (workers, prev, sampleInterval) {
  const workerIds = Object.keys(workers)
  if (workerIds.length === 0) return { aligned: [], lastSample: null }

  const lastSample = findLastSample(workers, workerIds)

  if (workerIds.length === 1) {
    const aligned = alignWorkerSamples(workers[workerIds[0]].values, prev, sampleInterval)
    return { aligned, lastSample }
  }

  const alignedArrays = []
  for (const workerId of workerIds) {
    const aligned = alignWorkerSamples(workers[workerId].values, prev, sampleInterval)
    if (aligned.length > 0) alignedArrays.push(aligned)
  }

  return { aligned: aggregateWorkers(alignedArrays), lastSample }
}

function findLastSample (workers, workerIds) {
  let lastSample = null
  for (const workerId of workerIds) {
    const values = workers[workerId].values
    if (values.length > 0) {
      const [timestamp, value] = values.at(-1)
      if (!lastSample || timestamp > lastSample.timestamp) {
        lastSample = { timestamp, value }
      }
    }
  }
  return lastSample
}

function aggregateWorkers (alignedArrays) {
  const k = alignedArrays.length
  if (k === 0) return []
  if (k === 1) return alignedArrays[0]

  const result = []
  const indices = new Array(k).fill(0)

  while (true) {
    let minTs = Infinity
    for (let i = 0; i < k; i++) {
      if (indices[i] < alignedArrays[i].length) {
        const ts = alignedArrays[i][indices[i]].timestamp
        if (ts < minTs) minTs = ts
      }
    }

    if (minTs === Infinity) break

    let maxVal = -Infinity
    for (let i = 0; i < k; i++) {
      const arr = alignedArrays[i]
      if (indices[i] < arr.length && arr[indices[i]].timestamp === minTs) {
        if (arr[indices[i]].value > maxVal) maxVal = arr[indices[i]].value
        indices[i]++
      }
    }

    result.push({ timestamp: minTs, value: maxVal })
  }

  return result
}

// samples format: [[timestamp, value], ...]
// output format: [{ timestamp, value }, ...]
function alignWorkerSamples (samples, prev, sampleInterval) {
  if (samples.length === 0) return []

  const aligned = []
  let nextIndex = 0

  if (!prev) {
    const [ts, val] = samples[0]
    prev = { timestamp: ts, value: val }
    nextIndex = 1
    aligned.push({
      timestamp: alignTimestamp(prev.timestamp, sampleInterval),
      value: prev.value
    })
  }

  let alignedTs = alignTimestamp(prev.timestamp, sampleInterval) + sampleInterval

  for (let i = nextIndex; i < samples.length; i++) {
    const [nextTs, nextVal] = samples[i]
    const next = { timestamp: nextTs, value: nextVal }
    while (alignedTs <= next.timestamp) {
      aligned.push({ timestamp: alignedTs, value: interpolate(prev, next, alignedTs) })
      alignedTs += sampleInterval
    }
    prev = next
  }

  return aligned
}

function alignTimestamp (timestamp, sampleInterval) {
  return Math.floor(timestamp / sampleInterval) * sampleInterval
}

function interpolate (prev, next, timestamp) {
  if (prev.timestamp === timestamp) return prev.value
  if (next.timestamp === timestamp) return next.value
  const ratio = (timestamp - prev.timestamp) / (next.timestamp - prev.timestamp)
  return prev.value + (next.value - prev.value) * ratio
}

module.exports = { alignInstanceMetrics, alignWorkerSamples, aggregateWorkers }
