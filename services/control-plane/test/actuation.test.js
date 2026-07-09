'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { PRESETS, resolveActuation, planStep } = require('../lib/actuation')

test('mode presets map to the two actuator slots (workload, routing)', () => {
  assert.deepStrictEqual(resolveActuation('observe'), { workload: 'noop', routing: 'apply' })
  assert.deepStrictEqual(resolveActuation('manage'), { workload: 'apply', routing: 'apply' })
  assert.deepStrictEqual(resolveActuation('advise'), { workload: 'plan', routing: 'plan' })
})

test('unknown or empty mode falls back to observe (today default)', () => {
  assert.deepStrictEqual(resolveActuation(undefined), PRESETS.observe)
  assert.deepStrictEqual(resolveActuation(null), PRESETS.observe)
  assert.deepStrictEqual(resolveActuation('bogus'), PRESETS.observe)
})

test('every slot value is one of apply|plan|noop', () => {
  const valid = new Set(['apply', 'plan', 'noop'])
  for (const preset of Object.values(PRESETS)) {
    assert.ok(valid.has(preset.workload), `workload ${preset.workload}`)
    assert.ok(valid.has(preset.routing), `routing ${preset.routing}`)
  }
})

test('advise is the only mode that plans both slots; observe/manage apply routing', () => {
  assert.strictEqual(resolveActuation('advise').routing, 'plan')
  assert.strictEqual(resolveActuation('advise').workload, 'plan')
  assert.strictEqual(resolveActuation('observe').routing, 'apply')
  assert.strictEqual(resolveActuation('manage').routing, 'apply')
})

test('planStep carries kind/action plus optional manifest/command/description', () => {
  assert.deepStrictEqual(
    planStep('HTTPRoute', 'apply', { manifest: { a: 1 }, command: 'kubectl apply', description: 'route' }),
    { kind: 'HTTPRoute', action: 'apply', manifest: { a: 1 }, command: 'kubectl apply', description: 'route' }
  )
  assert.deepStrictEqual(
    planStep('Deployment', 'scale'),
    { kind: 'Deployment', action: 'scale', manifest: null, command: null, description: null }
  )
})
