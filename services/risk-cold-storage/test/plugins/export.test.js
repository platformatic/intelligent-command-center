'use strict'

const test = require('node:test')
const { bootstrap, dbVersionFromMigrations } = require('../helper')
const assert = require('node:assert')
const moment = require('moment')
const { unzipFile } = require('../../lib/zip')
const { calculateHMAC } = require('../../lib/hmac')
const { rm, mkdtemp, readdir, readFile } = require('node:fs/promises')
const { basename, join } = require('node:path')

const hmacSecret = 'mysecretkey'

let dbVersion
test.before(async () => {
  dbVersion = await dbVersionFromMigrations()
})

test('export no data', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let uploadFileCalled = false
  const mockStorage = {
    uploadFiles: async (_files) => {
      uploadFileCalled = true
      return []
    }
  }
  app.storage = mockStorage

  await app.exportData()
  assert.strictEqual(uploadFileCalled, false)

  const { importsExport } = app.platformatic.entities
  const exportsOperations = await importsExport.find()
  assert.strictEqual(exportsOperations.length, 1)
  assert.strictEqual(exportsOperations[0].isExport, true)
  assert.strictEqual(exportsOperations[0].success, true)
  assert.strictEqual(!!exportsOperations[0].synchedAt, true)
  assert.strictEqual(exportsOperations[0].fileName, null)
  assert.strictEqual(exportsOperations[0].latestDataAcquiredAt, null)
  const logs = exportsOperations[0].logs
  delete logs[0].date
  delete logs[1].date
  delete logs[2].date
  assert.deepEqual(logs, [
    { msg: 'Starting Export', level: 'info' },
    { msg: 'No data to export', level: 'warn' },
    { level: 'info', msg: 'Export completed' }
  ])
})

test('export paths successfully', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let uploadFileCalled = false
  let uploadedFileName = null
  let exportedFiles = null
  let manifest = null
  let signatureHmac = null
  let calculatedHMAC = null
  const mockStorage = {
    uploadFiles: async (files) => {
      uploadFileCalled = true
      const [file, signature] = files
      calculatedHMAC = await calculateHMAC(file, hmacSecret)
      uploadedFileName = file
      await unzipFile(file, tempFolder)
      exportedFiles = (await readdir(tempFolder)).sort()
      manifest = JSON.parse(await readFile(join(tempFolder, 'manifest.json')))
      signatureHmac = await readFile(signature, 'utf8')
      return file
    }
  }
  app.storage = mockStorage

  const { path, importsExport } = app.platformatic.entities

  const now = moment.utc('2025-01-25T15:00:00Z')
  const oneWeekAgo = now.clone().subtract(1, 'weeks')
  const twoWeeksAgo = now.clone().subtract(2, 'weeks')
  const fiveWeeksAgo = now.clone().subtract(5, 'weeks')

  await path.insert({
    inputs: [{
      path: '/foo',
      counter: 1,
      dumpedAt: oneWeekAgo
    }, {
      path: '/bar',
      counter: 2,
      dumpedAt: oneWeekAgo
    }, {
      path: '/foo',
      counter: 2,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/bar',
      counter: 3,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/old',
      counter: 4,
      dumpedAt: fiveWeeksAgo
    }]
  })
  await app.exportData()

  assert.strictEqual(uploadFileCalled, true)
  assert.strictEqual(exportedFiles.length, 4)

  const format = 'YYYY-MM-DD HH:mm:ss+00'
  assert.deepStrictEqual(exportedFiles, [
    'manifest.json',
    `paths-${fiveWeeksAgo.format(format)}`,
    `paths-${twoWeeksAgo.format(format)}`,
    `paths-${oneWeekAgo.format(format)}`
  ])

  const allPaths = await path.find()
  for (const p of allPaths) {
    assert.strictEqual(!!p.exportedAt, true)
  }

  const exportsOperations = await importsExport.find()
  assert.strictEqual(exportsOperations.length, 1)
  assert.strictEqual(exportsOperations[0].isExport, true)
  assert.strictEqual(exportsOperations[0].success, true)
  assert.strictEqual(!!exportsOperations[0].synchedAt, true)
  assert.strictEqual(exportsOperations[0].fileName, basename(uploadedFileName))
  assert.strictEqual(exportsOperations[0].fileSize, 1165)
  assert.strictEqual(exportsOperations[0].latestDataAcquiredAt.toISOString(), oneWeekAgo.toISOString())
  assert.strictEqual(exportsOperations[0].logs.length, 5)
  assert.strictEqual(exportsOperations[0].hmac, signatureHmac)

  const expectedManifest = {
    db: { version: dbVersion },
    latestDataAcquiredAt: oneWeekAgo.toISOString(),
    files: [
      {
        name: 'paths-2024-12-21 15:00:00+00',
        size: 105,
        hmac: '6e479a479f4c0e2b91d0a222037451e7ff06b53024a8984c4ed78b27a3642f80'
      },
      {
        name: 'paths-2025-01-11 15:00:00+00',
        size: 210,
        hmac: '9f443c243297887f46857cebb336ec47a5c9830806ca6e80158774df066b1df0'
      },
      {
        name: 'paths-2025-01-18 15:00:00+00',
        size: 210,
        hmac: 'f8fa64e7461b2f29de895242debfa623364661b1f765bf2504e7457d9d852557'
      }
    ]
  }
  assert.deepStrictEqual(manifest, expectedManifest)
  assert.strictEqual(calculatedHMAC, signatureHmac)
})

test('export paths with upload errors', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let uploadFileCalled = false
  const mockStorage = {
    uploadFiles: async (_file) => {
      uploadFileCalled = true
      throw new Error('Error uploading file')
    }
  }
  app.storage = mockStorage

  const { path, importsExport } = app.platformatic.entities

  const now = moment('2025-01-25T15:00:00Z')
  const oneWeekAgo = now.clone().subtract(1, 'weeks')
  const twoWeeksAgo = now.clone().subtract(2, 'weeks')
  const fiveWeeksAgo = now.clone().subtract(5, 'weeks')

  await path.insert({
    inputs: [{
      path: '/foo',
      counter: 1,
      dumpedAt: oneWeekAgo
    }, {
      path: '/bar',
      counter: 2,
      dumpedAt: oneWeekAgo
    }, {
      path: '/foo',
      counter: 2,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/bar',
      counter: 3,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/old',
      counter: 4,
      dumpedAt: fiveWeeksAgo
    }]
  })
  await assert.rejects(app.exportData(), { message: 'Error uploading file' })

  assert.strictEqual(uploadFileCalled, true)

  const allPaths = await path.find()
  for (const p of allPaths) {
    // we don't mark them as exported
    assert.strictEqual(!!p.exportedAt, false)
  }

  const exportsOperations = await importsExport.find()
  assert.strictEqual(exportsOperations.length, 1)
  assert.strictEqual(exportsOperations[0].isExport, true)
  assert.strictEqual(exportsOperations[0].success, false)
  assert.strictEqual(!!exportsOperations[0].synchedAt, true)
  assert.strictEqual(exportsOperations[0].fileName, null)
  assert.strictEqual(exportsOperations[0].fileSize, 0)
  assert.strictEqual(exportsOperations[0].latestDataAcquiredAt, null)
  assert.strictEqual(exportsOperations[0].logs.length, 5)
  const error = exportsOperations[0].logs.find(l => l.level === 'error')
  assert.strictEqual(error.msg, 'Error uploading file')
})

test('do not export if already exported', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let uploadFileCalled = false
  let uploadedFileName = null
  let exportedFiles = null

  const mockStorage = {
    uploadFiles: async (files) => {
      uploadFileCalled = true
      const [file] = files
      uploadedFileName = file
      await unzipFile(file, tempFolder)
      exportedFiles = (await readdir(tempFolder)).sort()
      return file
    }
  }
  app.storage = mockStorage

  const { path, importsExport } = app.platformatic.entities

  const now = moment('2025-01-25T15:00:00Z')
  const oneWeekAgo = now.clone().subtract(1, 'weeks')
  const twoWeeksAgo = now.clone().subtract(2, 'weeks')
  const fiveWeeksAgo = now.clone().subtract(5, 'weeks')

  await path.insert({
    inputs: [{
      path: '/foo',
      counter: 1,
      dumpedAt: oneWeekAgo
    }, {
      path: '/bar',
      counter: 2,
      dumpedAt: oneWeekAgo
    }, {
      path: '/foo',
      counter: 2,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/bar',
      counter: 3,
      dumpedAt: twoWeeksAgo,
      exportedAt: twoWeeksAgo
    }, {
      path: '/old',
      counter: 4,
      dumpedAt: fiveWeeksAgo,
      exportedAt: fiveWeeksAgo
    }]
  })
  await app.exportData()

  assert.strictEqual(uploadFileCalled, true)
  assert.strictEqual(exportedFiles.length, 3)

  assert.deepStrictEqual(exportedFiles, [
    'manifest.json',
    'paths-2025-01-11 15:00:00+00',
    'paths-2025-01-18 15:00:00+00'
  ])

  const allPaths = await path.find()

  for (const p of allPaths) {
    assert.strictEqual(!!p.exportedAt, true)
  }

  const exportsOperations = await importsExport.find()
  assert.strictEqual(exportsOperations.length, 1)
  assert.strictEqual(exportsOperations[0].isExport, true)
  assert.strictEqual(exportsOperations[0].success, true)
  assert.strictEqual(!!exportsOperations[0].synchedAt, true)
  assert.strictEqual(exportsOperations[0].fileName, basename(uploadedFileName))
  assert.strictEqual(exportsOperations[0].fileSize, 885)
  assert.strictEqual(exportsOperations[0].latestDataAcquiredAt.toISOString(), oneWeekAgo.toISOString())
  assert.strictEqual(exportsOperations[0].logs.length, 5)
})
