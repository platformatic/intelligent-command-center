'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { gaussianKernel, welfordUpdate, round } = require('../lib/algorithm')

test('welfordUpdate', () => {
  const data = [33, 21, 13, 15, 180]

  let stats = { count: 0, mean: 0, m2: 0, stdDev: 0 }

  for (let i = 0; i < data.length; i++) {
    const value = data[i]
    stats = welfordUpdate(stats, value)

    const dataset = data.slice(0, i + 1)
    const mean = calculateMean(dataset)
    const m2 = calculateM2(dataset, mean)
    const stdDev = calculateStdDev(m2, i + 1)

    assert.strictEqual(stats.count, i + 1)
    assert.strictEqual(stats.mean, round(mean), 'wrong mean')
    assert.strictEqual(stats.stdDev, round(stdDev), 'wrong stdDev')
    assert.strictEqual(Math.round(stats.m2), Math.round(m2), 'wrong M2')
  }
})

test('gaussianKernel', () => {
  assert.strictEqual(round(gaussianKernel(-1, 2, 3)), 0.61)
  assert.strictEqual(round(gaussianKernel(-6, 5, 2)), 2.7e-7)
  assert.strictEqual(round(gaussianKernel(-8, 1, 3)), 0.011)
  assert.strictEqual(round(gaussianKernel(-3, -4, 2)), 0.88)
  assert.strictEqual(round(gaussianKernel(-4, 4, 2)), 0.00034)
})

function calculateMean (dataset) {
  const sum = dataset.reduce((acc, value) => acc + value, 0)
  return sum / dataset.length
}

function calculateM2 (dataset, mean) {
  return dataset.reduce((acc, value) => acc + (value - mean) ** 2, 0)
}

function calculateStdDev (m2, count) {
  return Math.sqrt(m2 / count)
}
