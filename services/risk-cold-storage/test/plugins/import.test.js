'use strict'

const test = require('node:test')
const { bootstrap, dbVersionFromMigrations } = require('../helper')
const assert = require('node:assert')
const { rm, mkdtemp, writeFile } = require('node:fs/promises')
const { join, resolve } = require('node:path')
const { zipFolder } = require('../../lib/zip')
const { calculateHMAC } = require('../../lib/hmac')
const { createManifest } = require('../../lib/manifest')

const hmacSecret = 'mysecretkey'

let dbVersion
test.before(async () => {
  dbVersion = await dbVersionFromMigrations()
})

test('no files to be imported on the storage', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let downloadFilesCalled = false
  const mockStorage = {
    downloadFiles: async () => {
      downloadFilesCalled = true
      return []
    }
  }
  app.storage = mockStorage

  await app.importData()
  assert.strictEqual(downloadFilesCalled, true)
})

test('import paths - validation error', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  // no path, validation must fail
  const exportedFile =
`{ "dumped_at":"2024-12-04T21:16:07.567Z","counter":2,"exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","counter":3,"exported_at":null,"imported_at":null}`

  let downloadFilesCalled = false
  const mockStorage = {
    downloadFiles: async (_lastImportedDumpFile, importDir) => {
      downloadFilesCalled = true

      // create the file
      const fileName = resolve(join(tempFolder, 'paths-2024-12-04T22:16:07.567'))
      await writeFile(fileName, exportedFile)

      // create the manifest
      await createManifest(tempFolder, dbVersion, [fileName], '2024-12-04T22:16:07.567', hmacSecret)

      const zipFile = join(importDir, '2024-12-04T22:16:07.567.zip')
      await zipFolder(tempFolder, zipFile)

      const hmac = await calculateHMAC(zipFile, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
      const signatureFile = join(importDir, '2024-12-04T22:16:07.567.sign')
      await writeFile(signatureFile, hmac)
      return [zipFile, signatureFile]
    }
  }
  app.storage = mockStorage

  await assert.rejects(app.importData(), { message: "data must have required property 'path'" })
  assert.strictEqual(downloadFilesCalled, true)

  const { path, importsExport } = app.platformatic.entities

  const allPaths = await path.find()
  assert.strictEqual(allPaths.length, 0) // no paths must be imported

  const importsOperations = await importsExport.find()
  assert.strictEqual(importsOperations.length, 1)
  assert.strictEqual(importsOperations[0].isExport, false)
  assert.strictEqual(importsOperations[0].success, false)
  assert.strictEqual(!!importsOperations[0].synchedAt, true)
  assert.strictEqual(importsOperations[0].fileName, '2024-12-04T22:16:07.567.zip')
  assert.strictEqual(importsOperations[0].fileSize, 0)
  const logs = importsOperations[0].logs
  delete logs[0].date
  assert.deepEqual(logs, [
    {
      level: 'error',
      msg: "data must have required property 'path'"
    }
  ])

  assert.strictEqual(importsOperations[0].latestDataAcquiredAt, null)
  assert.equal(importsOperations[0].importAttempts, 1)
})

test('import paths - retry for 10 attemps, then give up', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  // no path, validation must fail
  const exportedFile =
`{ "dumped_at":"2024-12-04T21:16:07.567Z","counter":2,"exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","counter":3,"exported_at":null,"imported_at":null}`

  const mockStorage = {
    downloadFiles: async (_lastImportedDumpFile, importDir) => {
      // create the file
      const fileName = resolve(join(tempFolder, 'paths-2024-12-04T22:16:07.567'))
      await writeFile(fileName, exportedFile)

      // create the manifest
      await createManifest(tempFolder, dbVersion, [fileName], '2024-12-04T22:16:07.567', hmacSecret)

      const zipFile = join(importDir, '2024-12-04T22:16:07.567.zip')
      await zipFolder(tempFolder, zipFile)

      const hmac = await calculateHMAC(zipFile, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
      const signatureFile = join(importDir, '2024-12-04T22:16:07.567.sign')
      await writeFile(signatureFile, hmac)
      return [zipFile, signatureFile]
    }
  }
  app.storage = mockStorage
  const { path, importsExport } = app.platformatic.entities

  // Import 10 times, should always fail, incrementing the counter
  for (let i = 1; i <= 10; i++) {
    try {
      await app.importData()
    } catch (e) {} // ignored

    const allPaths = await path.find()
    assert.strictEqual(allPaths.length, 0) // no paths must be imported

    const importsOperations = await importsExport.find()
    assert.strictEqual(importsOperations.length, 1)
    assert.strictEqual(importsOperations[0].success, false)
    assert.equal(importsOperations[0].importAttempts, i)
    assert.equal(importsOperations[0].discarded, false)
  }

  // More attempts should not change the result
  for (let i = 1; i <= 10; i++) {
    await app.importData()

    const allPaths = await path.find()
    assert.strictEqual(allPaths.length, 0) // no paths must be imported

    const importsOperations = await importsExport.find()
    assert.strictEqual(importsOperations.length, 1)
    // The number of attempts should not change
    assert.strictEqual(importsOperations[0].success, false)
    assert.equal(importsOperations[0].importAttempts, 10)
    assert.equal(importsOperations[0].discarded, true)
  }
})

test('import paths', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  const exportedFile =
`{"path":"/foo","dumped_at":"2024-12-04T21:16:07.567Z","counter":2,"exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","counter":3,"exported_at":null,"imported_at":null}`

  let downloadFilesCalled = false
  let lastImportedDumpFile = null
  let hmac
  const mockStorage = {
    downloadFiles: async (_lastImportedDumpFile, importDir) => {
      downloadFilesCalled = true

      // create the file
      const fileName = resolve(join(tempFolder, 'paths-2024-12-04T22:16:07.567Z'))
      await writeFile(fileName, exportedFile)

      // create the manifest
      await createManifest(tempFolder, dbVersion, [fileName], '2024-12-04T22:16:07.567Z', hmacSecret)

      const zipFile = join(importDir, '2024-12-04T22:16:07.567Z.zip')
      await zipFolder(tempFolder, zipFile)

      hmac = await calculateHMAC(zipFile, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
      const signatureFile = join(importDir, '2024-12-04T22:16:07.567Z.sign')
      await writeFile(signatureFile, hmac)
      lastImportedDumpFile = _lastImportedDumpFile
      return [zipFile, signatureFile]
    }
  }
  app.storage = mockStorage

  await app.importData()
  assert.strictEqual(downloadFilesCalled, true)

  const { path, importsExport } = app.platformatic.entities

  const allPaths = await path.find()
  for (const p of allPaths) {
    assert.strictEqual(!!p.importedAt, true)
  }
  assert.equal(lastImportedDumpFile, null)

  const importsOperations = await importsExport.find()
  assert.strictEqual(importsOperations.length, 1)
  assert.strictEqual(importsOperations[0].isExport, false)
  assert.strictEqual(importsOperations[0].success, true)
  assert.strictEqual(!!importsOperations[0].synchedAt, true)
  assert.strictEqual(importsOperations[0].fileName, '2024-12-04T22:16:07.567Z.zip')
  const logs = importsOperations[0].logs
  delete logs[0].date
  assert.deepEqual(logs, [{
    level: 'info',
    msg: 'Succesfully imported data from 2024-12-04T22:16:07.567Z.zip'
  }])
  assert.strictEqual(importsOperations[0].latestDataAcquiredAt.toISOString(), '2024-12-04T22:16:07.567Z')
  assert.equal(importsOperations[0].importAttempts, 1)
  assert.equal(importsOperations[0].discarded, false)
  assert.strictEqual(importsOperations[0].hmac, hmac)
})

test('import same paths twice', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  // t.after(async () => rm(tempFolder, { recursive: true, force: true }))

  const exportedFile =
`{"path":"/foo","dumped_at":"2024-12-04T21:16:07.567Z","counter":2,"exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","counter":3,"exported_at":null,"imported_at":null}`

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: hmacSecret
  })

  let lastImportedDumpFile = null

  const mockStorage = {
    downloadFiles: async (_lastImportedDumpFile, importDir) => {
      // create the file
      const fileName = resolve(join(tempFolder, 'paths-2024-12-04T22:16:07.567'))
      await writeFile(fileName, exportedFile)

      const zipName = _lastImportedDumpFile
        ? '2024-12-04T23:16:07.567.zip'
        : '2024-12-04T22:16:07.567.zip'

      // create the manifest
      await createManifest(tempFolder, dbVersion, [fileName], '2024-12-04T22:16:07.567', hmacSecret)

      const zipFile = join(importDir, zipName)
      await zipFolder(tempFolder, zipFile)

      const hmac = await calculateHMAC(zipFile, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
      const signatureFile = _lastImportedDumpFile
        ? join(importDir, '2024-12-04T23:16:07.567.sign')
        : join(importDir, '2024-12-04T22:16:07.567.sign')
      await writeFile(signatureFile, hmac)
      lastImportedDumpFile = _lastImportedDumpFile
      return [zipFile, signatureFile]
    }
  }

  app.storage = mockStorage

  // Import twice
  await app.importData()
  assert.equal(lastImportedDumpFile, null)
  await app.importData()
  assert.equal(lastImportedDumpFile, '2024-12-04T22:16:07.567.zip')

  const { path, importsExport } = app.platformatic.entities

  const allPaths = await path.find()
  assert.strictEqual(allPaths.length, 2)

  // We have two import operations becasue we actually imported two files successfully, even if
  // the data where the same. Note that we didn't duplicate the data in the database.

  const importsOperations = await importsExport.find()
  assert.strictEqual(importsOperations.length, 2)
  assert.strictEqual(importsOperations[0].isExport, false)
  assert.strictEqual(importsOperations[0].success, true)
  assert.strictEqual(!!importsOperations[0].synchedAt, true)
  assert.strictEqual(importsOperations[0].fileName, '2024-12-04T22:16:07.567.zip')
  assert.strictEqual(importsOperations[1].isExport, false)
  assert.strictEqual(importsOperations[1].success, true)
  assert.strictEqual(!!importsOperations[1].synchedAt, true)
  assert.strictEqual(importsOperations[1].fileName, '2024-12-04T23:16:07.567.zip')
})
