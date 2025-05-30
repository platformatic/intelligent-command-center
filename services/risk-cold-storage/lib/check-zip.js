'use strict'

const { readFile } = require('node:fs/promises')
const { calculateHMAC } = require('./hmac')
const { unzipFile } = require('./zip')
const { getManifestFromFolder } = require('./manifest')
const { join } = require('node:path')
const { readdir, basename } = require('node:fs/promises')

// Throws if the zip file signature fails or any file in the zip file has an invalid signature
const checkAndExtractZip = async (file, signatureFile, dir, secretKey) => {
  const signature = await readFile(signatureFile, 'utf-8')
  const hmac = await calculateHMAC(file, secretKey)
  if (signature !== hmac) {
    throw new Error(`Invalid zip signature for ${basename(file)}`)
  }
  await unzipFile(file, dir)
  const manifest = await getManifestFromFolder(dir)
  const { files } = manifest
  const hmacs = {}
  for (const file of files) {
    hmacs[file.name] = file.hmac
  }

  const filesInFolder = await readdir(dir)
  for (const file of filesInFolder) {
    if (file === 'manifest.json') {
      continue
    }
    const hmac = await calculateHMAC(join(dir, file), secretKey)
    if (hmac !== hmacs[file]) {
      throw new Error(`Invalid zip signature for ${basename(file)}`)
    }
  }
}

module.exports = { checkAndExtractZip }
