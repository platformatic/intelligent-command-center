'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { getParentRoute } = require('../lib/utils')

test('getParentRoute', () => {
  assert.strictEqual(getParentRoute('/products/:id'), '/products')
  assert.strictEqual(getParentRoute('/products/'), null)
  assert.strictEqual(getParentRoute('/products'), null)
  assert.strictEqual(getParentRoute('/'), null)

  assert.strictEqual(getParentRoute('/apps/products/:id'), '/apps/products')
  assert.strictEqual(getParentRoute('/apps/products/'), null)

  assert.strictEqual(getParentRoute('/apps/:id/products/:id'), '/apps/:id/products')
})
