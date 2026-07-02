'use strict'

// Cases mirror upstream src/algorithms/structural/test/segment-gate.test.js
// This exercises the level-step gate (segmentJumpPasses), which in ours uses a
// diff-based noiseScale rather than the reference's magnitude noiseFloor — a
// likely divergence point.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)

// 13 weeks. All days = 10 except Mondays: flat 10 except the last two (lastTwo).
function series (lastTwo) {
  const vals = []
  const weeks = 13
  for (let i = 0; i < weeks * 7; i++) {
    let v = 10
    if (i % 7 === 0) {
      const w = i / 7
      v = w < weeks - 2 ? 10 : (w === weeks - 2 ? lastTwo[0] : lastTwo[1])
    }
    vals.push(v)
  }
  return vals
}

const mondaySegments = (vals) =>
  H.modelFromVals(vals).patterns.filter((p) => p.scope.feature === 'dow' && p.scope.value === MONDAY)
const openHighMonday = (vals) =>
  mondaySegments(vals).filter((t) => t.end === undefined && Math.abs(t.effect) > 15)

describe('segment-boundary gate', () => {
  test('rejects a NOISY 2-point recent jump (no spurious current regime)', () => {
    const high = openHighMonday(series([40, 35]))
    assert.equal(high.length, 0, `expected no spurious dow=Monday regime, got ${high.map((t) => t.effect.toFixed(1))}`)
  })

  test('admits a CLEAN deterministic step (within-segment SE = 0)', () => {
    const segs = mondaySegments(series([40, 40]))
    const open = segs.find((t) => t.end === undefined)
    assert.ok(open, 'expected a dow=Monday term')
    assert.ok(open.effect > 20, `expected the clean step captured (~+30), got ${open.effect.toFixed(1)}`)
  })

  test('one value (35 vs 40) flips the decision — isolates the gate', () => {
    assert.equal(openHighMonday(series([40, 35])).length, 0)
    assert.ok(mondaySegments(series([40, 40])).some((t) => t.end === undefined && t.effect > 20))
  })
})
