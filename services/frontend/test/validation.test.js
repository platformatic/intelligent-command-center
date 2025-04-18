import { test } from 'node:test'
import assert from 'node:assert'
import { pathRegExp } from '../src/utils.js'
test('path validation regular expression', async (t) => {
  const valid = [
    '/test/',
    '/multiple/paths/'
  ]
  const notValid = [
    '/test',
    '/multiple/paths'
  ]

  for (let i = 0; i < valid.length; i++) {
    assert.ok(pathRegExp.test(valid[i]))
    assert.ok(!pathRegExp.test(notValid[i]))
  }
})
