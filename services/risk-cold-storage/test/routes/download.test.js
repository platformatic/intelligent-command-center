'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { bootstrap } = require('../helper')
const Readable = require('stream').Readable

test('not existent file', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const res = await app.inject({
    method: 'GET',
    url: '/download/file1.zip'
  })

  const { statusCode, body } = res
  assert.equal(statusCode, 404)
  assert.deepEqual(JSON.parse(body), { error: 'File not found' })
})

test('download file endpoint', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  let file = null
  const mockStorage = {
    getFileStream: async (_file) => {
      file = _file
      const stream = Readable.from(['test'])
      return stream
    }
  }
  app.storage = mockStorage

  await app.platformatic.entities.importsExport.save({
    input: {
      success: true,
      isExport: false,
      synchedAt: new Date(),
      fileName: 'file1.zip'
    }
  })

  const res = await app.inject({
    method: 'GET',
    url: '/download/file1.zip'
  })

  const { statusCode, body } = res
  assert.equal(statusCode, 200)
  assert.equal(res.headers['content-disposition'], 'attachment; filename="file1.zip"')
  assert.equal(body, 'test')
  assert.equal(file, 'file1.zip')
})
