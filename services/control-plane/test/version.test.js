'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { deriveVersion, combineImageRef } = require('../lib/version')

test('deriveVersion mints a plt_ id from the image ref, null when it is not a real ref', () => {
  assert.match(deriveVersion('ghcr.io/org/app:latest'), /^plt_[0-9A-Za-z]{24}$/)
  assert.strictEqual(deriveVersion('bare-name-no-colon'), null)
  assert.strictEqual(deriveVersion(''), null)
  assert.strictEqual(deriveVersion(null), null)
})

test('combineImageRef combines a tag ref with the resolved digest', () => {
  assert.strictEqual(
    combineImageRef('ghcr.io/org/app:latest', 'ghcr.io/org/app@sha256:AAAA'),
    'ghcr.io/org/app:latest@sha256:AAAA'
  )
})

test('combineImageRef uses a spec ref that already carries a digest verbatim', () => {
  // digest-only spec ref -> used as-is, no imageDigest needed (no race)
  assert.strictEqual(
    combineImageRef('ghcr.io/org/app@sha256:AAAA', undefined),
    'ghcr.io/org/app@sha256:AAAA'
  )
  // tag+digest spec ref -> the spec digest wins, not re-appended
  assert.strictEqual(
    combineImageRef('ghcr.io/org/app:latest@sha256:AAAA', 'ghcr.io/org/app@sha256:BBBB'),
    'ghcr.io/org/app:latest@sha256:AAAA'
  )
})

test('combineImageRef returns null when the digest is not resolved yet (caller retries)', () => {
  assert.strictEqual(combineImageRef('ghcr.io/org/app:latest', undefined), null)
  assert.strictEqual(combineImageRef('ghcr.io/org/app:latest', null), null)
  assert.strictEqual(combineImageRef(undefined, 'x@sha256:AAAA'), null)
})

test('version changes if the tag changes (same digest)', () => {
  const a = deriveVersion(combineImageRef('r/app:1', 'r/app@sha256:XXXX'))
  const b = deriveVersion(combineImageRef('r/app:2', 'r/app@sha256:XXXX'))
  assert.match(a, /^plt_[0-9A-Za-z]{24}$/)
  assert.notStrictEqual(a, b)
})

test('version changes if the digest changes (same mutable tag -- the :latest re-push case)', () => {
  const a = deriveVersion(combineImageRef('r/app:latest', 'r/app@sha256:XXXX'))
  const b = deriveVersion(combineImageRef('r/app:latest', 'r/app@sha256:YYYY'))
  assert.notStrictEqual(a, b)
})

test('version is stable for the same tag+digest (idempotent, no churn)', () => {
  const a = deriveVersion(combineImageRef('r/app:latest', 'r/app@sha256:XXXX'))
  const b = deriveVersion(combineImageRef('r/app:latest', 'r/app@sha256:XXXX'))
  assert.strictEqual(a, b)
})
