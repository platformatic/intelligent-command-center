'use strict'

// Cases mirror upstream src/algorithms/structural/test/segment.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)

describe('within-scope regime change — current regime predicts', () => {
  // Monday +90 for 8 weeks, then +30 for 6 weeks; current regime is +30 → predict 40.
  const vals = []
  for (let i = 0; i < 98; i++) {
    const week = Math.floor(i / 7)
    vals.push(i % 7 === 0 ? (week < 8 ? 100 : 40) : 10)
  }

  test('next Monday follows the current regime (40), not the old one (100)', () => {
    assert.equal(H.predictVals(vals, 98), 40)
  })

  test('the CURRENT (open) Monday term reflects the current regime (~+30)', () => {
    const model = H.modelFromVals(vals)
    const cur = model.patterns.find(
      (p) => p.scope.feature === 'dow' && p.scope.value === MONDAY && p.end === undefined
    )
    assert.ok(cur, 'expected a current (open) Monday term')
    assert.ok(Math.abs(cur.effect - 30) < 5, `current Monday effect=${cur.effect}, want ~30`)
  })

  test('non-Monday still baseline 10', () => {
    assert.equal(H.predictVals(vals, 99), 10)
  })
})
