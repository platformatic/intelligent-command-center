'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { patternEffect, occurrenceIndexAt } = require('../../../lib/pattern-predictor/contribution')

// 28 windows, dow = i % 7; Mondays (dow 1) fall on indices 1, 8, 15, 22.
const timeWindows = Array.from({ length: 28 }, (_, i) => ({ dow: i % 7 }))
const monday = { matches: (w) => w.dow === 1 }

test('patternEffect: an open level pattern lands on every matching window in the span', () => {
  const pattern = { scope: monday, kind: 'level', effect: 30, start: 0, end: undefined }
  const effect = patternEffect(pattern, timeWindows)
  assert.equal(effect[1], 30)
  assert.equal(effect[8], 30)
  assert.equal(effect[22], 30)
  assert.equal(effect[2], 0) // a Tuesday
})

test('patternEffect: a line ramps occurrence by occurrence from the span start', () => {
  const pattern = { scope: monday, kind: 'line', effect: 10, slope: 2, start: 0, end: undefined }
  const effect = patternEffect(pattern, timeWindows)
  assert.equal(effect[1], 10) // occurrence 0
  assert.equal(effect[8], 12) // occurrence 1
  assert.equal(effect[15], 14) // occurrence 2
  assert.equal(effect[22], 16) // occurrence 3
})

test('patternEffect: a closed pattern only covers up to its end window', () => {
  const pattern = { scope: monday, kind: 'level', effect: 30, start: 0, end: 8 }
  const effect = patternEffect(pattern, timeWindows)
  assert.equal(effect[1], 30)
  assert.equal(effect[8], 30)
  assert.equal(effect[15], 0) // past end
  assert.equal(effect[22], 0)
})

test('occurrenceIndexAt: clamps to the last occurrence inside the observed range', () => {
  assert.equal(occurrenceIndexAt(monday, timeWindows, 22), 3) // 4th Monday
  assert.equal(occurrenceIndexAt(monday, timeWindows, 10), 3) // ≤ last index → clamped
})

test('occurrenceIndexAt: extrapolates forward by the median occurrence gap', () => {
  assert.equal(occurrenceIndexAt(monday, timeWindows, 29), 4)
  assert.equal(occurrenceIndexAt(monday, timeWindows, 36), 5)
})
