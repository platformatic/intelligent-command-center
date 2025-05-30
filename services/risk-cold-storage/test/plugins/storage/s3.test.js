'use strict'

const test = require('node:test')
const { bootstrap, mockS3Commands } = require('../../helper')
const assert = require('node:assert')
const { tmpdir } = require('node:os')
const { mkdtemp, rm, readdir } = require('node:fs/promises')
const { join, resolve } = require('node:path')
const { writeFile } = require('node:fs/promises')
const { Readable } = require('stream')

test('no storage set if PLT_RISK_COLD_STORAGE_EXPORTER is not set', async (t) => {
  const app = await bootstrap(t)
  const { storage } = app
  assert.strictEqual(storage, undefined)
})

test('S3 storage set if PLT_RISK_COLD_STORAGE_EXPORTER is set', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })
  const { storage } = app
  assert.strictEqual(storage.constructor.name, 'S3')
})

test('S3 storage uploadFiles', async (t) => {
  const putObjectCommand = {
    resolve: { Key: 'file-0' }
  }
  mockS3Commands(t, { putObjectCommand })

  const tempDir = await mkdtemp(join(tmpdir(), 's3-test'))
  t.after(() => rm(tempDir, { recursive: true }))

  const files = []
  for (let i = 0; i < 10; i++) {
    const fileName = resolve(join(tempDir, `file-${i}`))
    await writeFile(fileName, `content-${i}`)
    files.push(fileName)
  }

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3',
    PLT_RISK_COLD_STORAGE_AWS_REGION: 'us-west-1',
    PLT_RISK_COLD_STORAGE_AWS_BUCKET: 'foo',
    PLT_RISK_COLD_STORAGE_AWS_ACCESS_KEY_ID: 'foo',
    PLT_RISK_COLD_STORAGE_AWS_SECRET_ACCESS_KEY: 'foo'
  })
  const successfulUploads = await app.storage.uploadFiles(files)
  assert.deepStrictEqual(successfulUploads, [
    'file-0',
    'file-1',
    'file-2',
    'file-3',
    'file-4',
    'file-5',
    'file-6',
    'file-7',
    'file-8',
    'file-9'
  ])
})

test('S3 storage downloadFiles', async (t) => {
  const getObjectCommand = {
    resolve: { Body: Readable.from('content-foo') }
  }

  const listObjectsCommand = {
    resolve: {
      Contents: [
        { Key: 'foo-0' },
        { Key: 'foo-1' },
        { Key: 'foo-2' },
        { Key: 'foo-3' },
        { Key: 'foo-4' }
      ]
    }
  }

  mockS3Commands(t, { getObjectCommand, listObjectsCommand })

  const tempUploadDir = await mkdtemp(join(tmpdir(), 's3-test'))
  t.after(() => rm(tempUploadDir, { recursive: true }))

  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: true,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'

  })

  const tempDownloadDir = await mkdtemp(join(tmpdir(), 's3-test-down'))
  // t.after(() => rm(tempDownloadDir, { recursive: true }))

  const lastImportedDumpTime = '2021-09-01T00:00:00.000Z'
  const ret = await app.storage.downloadFiles(lastImportedDumpTime, tempDownloadDir)
  const expectedKeys = ['foo-0', 'foo-1', 'foo-2', 'foo-3', 'foo-4']
  const expectedFiles = expectedKeys.map(k => resolve(join(tempDownloadDir, k)))
  assert.deepStrictEqual(ret, expectedFiles)
  const downloaded = await readdir(tempDownloadDir)
  assert.deepStrictEqual(downloaded, ['foo-0', 'foo-1', 'foo-2', 'foo-3', 'foo-4'])
})
