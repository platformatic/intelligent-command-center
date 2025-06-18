'use strict'

const { test } = require('node:test')
const { writeFile, rm, mkdtemp, readdir } = require('node:fs/promises')
const assert = require('node:assert')
const { join } = require('node:path')
const { zipFolder, unzipFile } = require('../../lib/zip')

test('zip a folder and unzip it', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  const tempFolderDest = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))
  t.after(async () => rm(tempFolderDest, { recursive: true, force: true }))

  // Create some test files inside the temporary folder
  writeFile(join(tempFolder, 'file1.txt'), 'Hello, World!')
  writeFile(join(tempFolder, 'file2.txt'), 'This is a test file.')
  const zipFile = join(tempFolderDest, 'test.zip')
  await zipFolder(tempFolder, zipFile)

  const unzipFolderDest = await mkdtemp('/tmp/test-')
  t.after(async () => rm(unzipFolderDest, { recursive: true, force: true }))
  await unzipFile(zipFile, unzipFolderDest)
  const files = await readdir(unzipFolderDest)
  assert.strictEqual(files.length, 2)
  assert.strictEqual(files.includes('file1.txt'), true)
  assert.strictEqual(files.includes('file2.txt'), true)
})
