'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { slotId, suggestionIdentity, NAMESPACE } = require('../../lib/ids')

const APP = '82b54a39-ad48-4cc5-89d3-fd7e8bb865ee'
const SLOT = Date.UTC(2025, 0, 10, 17, 0) // 2025-01-10T17:00:00Z

test('slotId is deterministic and a valid uuid v5', () => {
  const a = slotId('stats', APP, SLOT)
  assert.equal(a, slotId('stats', APP, SLOT), 'same input → same id')
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('slotId is namespaced per table — the same slot never collides across tables', () => {
  const ids = ['slot', 'stats', 'pred', 'sched'].map((t) => slotId(t, APP, SLOT))
  assert.equal(new Set(ids).size, 4, 'four tables → four distinct ids for one slot instant')
})

test('slotId varies with app and with slot instant', () => {
  const other = '00000000-0000-0000-0000-000000000001'
  assert.notEqual(slotId('stats', APP, SLOT), slotId('stats', other, SLOT))
  assert.notEqual(slotId('stats', APP, SLOT), slotId('stats', APP, SLOT + 60000))
})

test('slotId accepts a Date as well as epoch ms', () => {
  assert.equal(slotId('stats', APP, new Date(SLOT)), slotId('stats', APP, SLOT))
})

test('slotId rejects an unknown table rather than silently hashing it', () => {
  assert.throws(() => slotId('nope', APP, SLOT), /unknown slot table/)
})

test('suggestionIdentity is deterministic and order-insensitive on scopeKeys', () => {
  const a = suggestionIdentity(APP, 18, ['dow|5', 'dom|3'])
  const b = suggestionIdentity(APP, 18, ['dom|3', 'dow|5']) // sorted internally
  assert.equal(a, b)
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('suggestionIdentity distinguishes app, slot and scope set', () => {
  const other = '00000000-0000-0000-0000-000000000001'
  assert.notEqual(suggestionIdentity(APP, 18, ['dow|5']), suggestionIdentity(APP, 19, ['dow|5']))
  assert.notEqual(suggestionIdentity(APP, 18, ['dow|5']), suggestionIdentity(APP, 18, []))
  assert.notEqual(suggestionIdentity(APP, 18, ['dow|5']), suggestionIdentity(other, 18, ['dow|5']))
})

test('the baseline (empty scope set) has a stable identity', () => {
  assert.equal(suggestionIdentity(APP, 18, []), suggestionIdentity(APP, 18, []))
})

test('a suggestion identity never collides with a slot id', () => {
  assert.notEqual(suggestionIdentity(APP, 18, ['dow|5']), slotId('stats', APP, SLOT))
})

test('NAMESPACE is frozen — changing it would orphan every stored id', () => {
  assert.equal(NAMESPACE, 'c1b0a3d4-7e2f-4a91-8b5c-6d0e9f2a3b71')
})
