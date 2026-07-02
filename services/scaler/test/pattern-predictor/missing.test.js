'use strict'

// Cases mirror upstream src/algorithms/structural/test/missing.test.js
// model.observed[] → model.timeWindows[i].observed; Monday = ref dow 0 → our dow 1.
// NOTE: reference level terms carry slope 0; ours carry slope undefined, so the
// "no line" assertion checks kind === 'level' (the logical claim) only.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)
const mondayTerms = (model) => model.patterns.filter((p) => p.scope.feature === 'dow' && p.scope.value === MONDAY)

describe('Stage 1 missing-data — boundary safety', () => {
  test('null never produces NaN — output is a finite integer', () => {
    const vals = new Array(60).fill(10)
    vals[59] = null
    const out = H.predictVals(vals, 60)
    assert.ok(Number.isInteger(out) && Number.isFinite(out), `got ${out}`)
  })

  test('a recent window that is mostly missing still yields a finite integer', () => {
    const vals = new Array(60).fill(10)
    for (let i = 50; i < 60; i++) vals[i] = null
    const out = H.predictVals(vals, 60)
    assert.ok(Number.isInteger(out) && Number.isFinite(out), `got ${out}`)
  })

  test('null is NOT treated as 0 (imputed, not a fake drain)', () => {
    const nullVals = new Array(60).fill(10); for (let i = 39; i < 60; i++) nullVals[i] = null
    const zeroVals = new Array(60).fill(10); for (let i = 39; i < 60; i++) zeroVals[i] = 0
    assert.equal(H.predictVals(nullVals, 60), 10, 'null (outage) should hold ~10')
    assert.ok(H.predictVals(zeroVals, 60) <= 3, 'zero (real drain) should collapse toward 0')
  })
})

describe('Stage 1 missing-data — graceful degradation', () => {
  test('flat series + one mid-series null → prediction unchanged', () => {
    const dense = new Array(60).fill(10)
    const holed = new Array(60).fill(10); holed[30] = null
    assert.equal(H.predictVals(dense, 60), 10)
    assert.equal(H.predictVals(holed, 60), 10)
  })

  test('dow pattern + missing Monday → Monday support drops by exactly 1', () => {
    const vals = []
    for (let i = 0; i < 84; i++) vals.push(i % 7 === 0 ? 100 : 10)
    const denseSupport = mondayTerms(H.modelFromVals(vals)).reduce((n, t) => n + t.segVals.length, 0)
    assert.equal(denseSupport, 12, `dense Monday occurrences=${denseSupport}`)

    const holed = vals.slice(); holed[7 * 5] = null
    const m = H.modelFromVals(holed)
    const holedSupport = mondayTerms(m).reduce((n, t) => n + t.segVals.length, 0)
    assert.equal(holedSupport, 11, `masked Monday occurrences should be 11, got ${holedSupport}`)
    const eff = mondayTerms(m)[0].effect
    assert.ok(Math.abs(eff - 90) < 1.5, `Monday effect ${eff} should stay ~90`)
  })

  test('Monday still predicts ~100 with one Monday missing', () => {
    const vals = []
    for (let i = 0; i < 84; i++) vals.push(i % 7 === 0 ? 100 : 10)
    vals[7 * 5] = null
    assert.equal(H.predictVals(vals, 84), 100)
  })
})

describe('Stage 1 missing-data — line scopes degrade to level under masking', () => {
  const ramp = []
  for (let i = 0; i < 84; i++) ramp.push(i % 7 === 0 ? 20 + 10 * Math.floor(i / 7) : 10)

  test('dense: the Monday ramp is captured as a LINE', () => {
    const terms = mondayTerms(H.modelFromVals(ramp))
    assert.ok(terms.some((t) => t.kind === 'line' && t.slope > 0), 'expected a Monday line term')
  })

  test('one missing Monday: NO line is fit — every Monday term is a level', () => {
    const holed = ramp.slice(); holed[7 * 6] = null
    const terms = mondayTerms(H.modelFromVals(holed))
    assert.ok(terms.length > 0, 'expected Monday terms')
    assert.ok(terms.every((t) => t.kind === 'level'),
      `lines must be disabled under masking: ${JSON.stringify(terms.map((t) => t.kind))}`)
  })
})

describe('Stage 1 missing-data — dense history is an exact no-op', () => {
  test('observed is all-true for fully dense input', () => {
    const m = H.modelFromVals(new Array(40).fill(10))
    const observed = m.timeWindows.map((w) => w.observed)
    assert.ok(observed.length === 40 && observed.every(Boolean), `len=${observed.length}`)
  })

  test('dense dow readout is exact', () => {
    const vals = []
    for (let i = 0; i < 28; i++) vals.push(i % 7 === 0 ? 100 : 10)
    for (let k = 0; k < 7; k++) {
      const t = 28 + k
      assert.equal(H.predictVals(vals, t), t % 7 === 0 ? 100 : 10)
    }
  })
})
