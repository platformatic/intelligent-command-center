'use strict'

// Cases mirror upstream src/algorithms/structural/test/line-cap.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

function nextDom (from, dom) { let i = from; while (H.dateAt(i).getUTCDate() !== dom) i++; return i }

describe('low-support line readout cap', () => {
  test('a thin (5-point) line does NOT extrapolate beyond its observed range', () => {
    const vals = []
    for (let i = 0; i < 150; i++) {
      const dom = H.dateAt(i).getUTCDate()
      vals.push(dom === 15 ? 10 + 20 + Math.floor(i / 30) * 10 : 10)
    }
    const p = H.predictVals(vals, nextDom(vals.length, 15))
    assert.ok(p <= 72, `thin line must not extrapolate past observed ~70; got ${p}`)
    assert.ok(p >= 60, `but should still carry the observed level; got ${p}`)
  })

  test('a well-supported (12-point) trend STILL extrapolates past its range', () => {
    const vals = []
    for (let i = 0; i < 84; i++) {
      const w = Math.floor(i / 7)
      vals.push(i % 7 === 0 ? 10 + 10 * w : 10)
    }
    assert.equal(H.predictVals(vals, 84), 130)
  })
})
