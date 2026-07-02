'use strict'

// Cases mirror upstream src/algorithms/structural/test/clamp.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

// weekdays (dow 0..4) climb; weekends (dow 5,6) pinned at the floor (1).
function bimodal (start, growth) {
  const vals = []
  for (let i = 0; i < 140; i++) vals.push(i % 7 < 5 ? Math.round(start + growth * i) : 1)
  return vals
}
function nextSaturday (from) { let i = from; while (i % 7 !== 5) i++; return i }

describe('output clamp at 0 (no negative pod counts)', () => {
  const configs = [
    { start: 40, growth: 1.0, horizon: 26 },
    { start: 30, growth: 1.2, horizon: 33 },
    { start: 40, growth: 1.5, horizon: 40 },
    { start: 20, growth: 1.0, horizon: 19 }
  ]

  test('predict never returns a negative value on floor-overshoot fixtures', () => {
    for (const c of configs) {
      const vals = bimodal(c.start, c.growth)
      const i = nextSaturday(vals.length + c.horizon)
      const p = H.predictVals(vals, i)
      assert.ok(p >= 0, `start=${c.start} growth=${c.growth}: predict=${p} (must be ≥ 0)`)
      assert.ok(Number.isInteger(p), `predict must be an integer, got ${p}`)
    }
  })

  test('a known negative-raw case clamps exactly to 0', () => {
    const vals = bimodal(30, 1.2)
    const i = nextSaturday(vals.length + 33)
    assert.equal(H.predictVals(vals, i), 0)
  })
})
