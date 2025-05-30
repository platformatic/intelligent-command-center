'use strict'

const test = require('node:test')
const { writeFile, rm, mkdtemp } = require('node:fs/promises')
const assert = require('node:assert')
const { join } = require('node:path')
const { calculateHMAC, verifyHMAC } = require('../../lib/hmac.js')
const { zipFolder } = require('../../lib/zip')

const secretKey = 'my-secret-key'

test('hmac calculate and verify', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  const tempFolderDest = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))
  t.after(async () => rm(tempFolderDest, { recursive: true, force: true }))

  // Create some test files inside the temporary folder
  writeFile(join(tempFolder, 'file1.txt'), 'Hello, World!')
  writeFile(join(tempFolder, 'file2.txt'), 'This is a test file.')
  const zipFile = join(tempFolderDest, 'test.zip')
  await zipFolder(tempFolder, zipFile)

  // Calculate the HMAC of the zip file:
  const hmac = await calculateHMAC(zipFile, secretKey)
  const res = await verifyHMAC(zipFile, secretKey, hmac)

  assert.equal(res, true)
})

test('hmac verify fails', async (t) => {
  const tempFolder = await mkdtemp('/tmp/test-')
  const tempFolderDest = await mkdtemp('/tmp/test-')
  t.after(async () => rm(tempFolder, { recursive: true, force: true }))
  t.after(async () => rm(tempFolderDest, { recursive: true, force: true }))

  // Create some test files inside the temporary folder
  writeFile(join(tempFolder, 'file1.txt'), 'Hello, World!')
  writeFile(join(tempFolder, 'file2.txt'), 'This is a test file.')
  const zipFile = join(tempFolderDest, 'test.zip')
  await zipFolder(tempFolder, zipFile)

  // Calculate the HMAC of the zip file:
  assert.rejects(verifyHMAC(zipFile, secretKey, 'invalid-hmac'), { message: 'HMAC verification failed' })
})
