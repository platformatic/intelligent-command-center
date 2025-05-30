'use strict'

const { calculateHMAC } = require('./hmac')
const { stat, writeFile, readFile } = require('node:fs/promises')
const { join, basename } = require('node:path')

const createManifest = async (targetFolder, dbVersion, files, latestDataAcquiredAt, secretKey) => {
  const fileInfos = []
  for (const file of files) {
    const hmac = await calculateHMAC(file, secretKey)
    const stats = await stat(file)
    fileInfos.push({
      name: basename(file),
      size: stats.size,
      hmac
    })
  }

  const manifest = {
    db: {
      version: dbVersion
    },
    latestDataAcquiredAt,
    files: fileInfos
  }
  const manifestFilePath = join(targetFolder, 'manifest.json')
  await writeFile(manifestFilePath, JSON.stringify(manifest, null, 2))
}

const getManifestFromFolder = async (folder) => {
  const manifestFilePath = join(folder, 'manifest.json')
  const manifest = await readFile(manifestFilePath, 'utf-8')
  return JSON.parse(manifest)
}

module.exports = { createManifest, getManifestFromFolder }
