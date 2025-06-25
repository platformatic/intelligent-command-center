'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { bootstrap } = require('../helper')

test('should return isImporter: true when PLT_RISK_COLD_STORAGE_EXPORTER is false', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false
  })

  const response = await app.inject({
    method: 'GET',
    url: '/status'
  })

  assert.strictEqual(response.statusCode, 200)
  assert.deepStrictEqual(response.json(), {
    isImporter: true,
    isExporter: false
  })
})

test('should return isImporter: false when PLT_RISK_COLD_STORAGE_EXPORTER is true', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true
  })

  const response = await app.inject({
    method: 'GET',
    url: '/status'
  })

  assert.strictEqual(response.statusCode, 200)
  assert.deepStrictEqual(response.json(), {
    isImporter: false,
    isExporter: true
  })
})

test('should return isImporter: false when PLT_RISK_COLD_STORAGE_EXPORTER is undefined', async (t) => {
  const app = await bootstrap(t, {})

  const response = await app.inject({
    method: 'GET',
    url: '/status'
  })

  assert.strictEqual(response.statusCode, 200)
  assert.deepStrictEqual(response.json(), {
    isImporter: false,
    isExporter: false
  })
})
