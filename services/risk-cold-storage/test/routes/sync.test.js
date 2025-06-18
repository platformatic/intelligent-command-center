'use strict'

const { test } = require('node:test')
const { suite } = test
const assert = require('node:assert')
const { bootstrap } = require('../helper')

test('sync with no pickup/dropoff configured', async (t) => {
  const app = await bootstrap(t)
  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)
  assert.deepEqual(res, { status: 'disabled' })
})

test('trigger export', async (t) => {
  let calledDump = false
  const riskService = {
    getDump: async () => {
      console.log('called dump')
      calledDump = true
    }
  }

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  }, { riskService })

  const mockStorage = {
    uploadFiles: async (_files) => {
      return []
    }
  }

  app.storage = mockStorage

  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)
  assert.deepEqual(res, { status: 'exported' })

  // Export must force the dump from redis to cold storage
  assert.equal(calledDump, true)
})

test('trigger import', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'false',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const mockStorage = {
    downloadFiles: async (_lastImportedDumpFile, _importDir) => {
      return []
    }
  }

  app.storage = mockStorage
  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)
  assert.deepEqual(res, { status: 'imported' })
})

test('get all the available imports', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'false',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const now = new Date()
  const mockStorage = {
    availableFiles: async (_lastImportedFile) => {
      return [
        { fileName: ' file1.zip', size: 100, lastModified: now },
        { fileName: ' file2.zip', size: 200, lastModified: now },
        { fileName: ' ignored.mp3', size: 300, lastModified: now }
      ]
    }
  }

  app.storage = mockStorage
  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync/available'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)

  const expected = [
    {
      fileName: ' file1.zip',
      lastModified: now.toISOString(),
      size: 100
    },
    {
      fileName: ' file2.zip',
      lastModified: now.toISOString(),
      size: 200
    }
  ]
  assert.deepEqual(res, expected)
})

test('get all the available imports is didabled on exporter', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const mockStorage = {
    availableFiles: async (_lastImportedFile) => {
      return ['file1.zip', 'file2.zip', 'ignored.mp3']
    }
  }

  app.storage = mockStorage
  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync/available'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)
  assert.deepEqual(res, { status: 'disabled' })
})

test('get latest imported data time', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'false',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  {
    // no data
    const { statusCode, body } = await app.inject({
      method: 'GET',
      url: '/sync/latest'
    })

    const res = JSON.parse(body)
    assert.equal(statusCode, 200)
    assert.deepEqual(res, { latestDataAcquiredAt: null })
  }

  {
    const latest = new Date().toISOString()

    await app.platformatic.entities.importsExport.save({
      input: {
        success: true,
        isExport: false,
        synchedAt: new Date(),
        fileName: 'file1.zip',
        logs: '[]',
        latestDataAcquiredAt: latest
      }
    })
    const { statusCode, body } = await app.inject({
      method: 'GET',
      url: '/sync/latest'
    })

    const res = JSON.parse(body)
    assert.equal(statusCode, 200)
    assert.deepEqual(res, { latestDataAcquiredAt: latest })
  }
})

test('get latest imported data time but import is disabled', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/sync/latest'
  })

  const res = JSON.parse(body)
  assert.equal(statusCode, 200)
  assert.deepEqual(res, { status: 'disabled' })
})

suite('get sync config', async (t) => {
  test('synch disabled', async (t) => {
    const app = await bootstrap(t, { test: false })
    const { statusCode, body } = await app.inject({
      method: 'GET',
      url: '/sync/config'
    })

    const res = JSON.parse(body)
    assert.equal(statusCode, 200)
    assert.deepEqual(res, {
      enabled: false
    })
  })

  test('export config', async (t) => {
    const app = await bootstrap(t, {
      PLT_RISK_COLD_STORAGE_EXPORTER: 'true',
      PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
      PLT_RISK_COLD_STORAGE_AWS_BUCKET: 'bucket'
    })

    const { statusCode, body } = await app.inject({
      method: 'GET',
      url: '/sync/config'
    })

    const res = JSON.parse(body)
    assert.equal(statusCode, 200)
    assert.deepEqual(res, {
      enabled: true,
      isExporter: true,
      isImporter: false,
      target: 's3://bucket'
    })
  })

  test('import config', async (t) => {
    const app = await bootstrap(t, {
      PLT_RISK_COLD_STORAGE_EXPORTER: 'false',
      PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
      PLT_RISK_COLD_STORAGE_AWS_BUCKET: 'bucket'
    })

    const { statusCode, body } = await app.inject({
      method: 'GET',
      url: '/sync/config'
    })

    const res = JSON.parse(body)
    assert.equal(statusCode, 200)
    assert.deepEqual(res, {
      enabled: true,
      isExporter: false,
      isImporter: true,
      target: 's3://bucket'
    })
  })
})
