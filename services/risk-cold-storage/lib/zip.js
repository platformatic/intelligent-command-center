const { pipeline } = require('stream/promises')
const archiver = require('archiver')
const { createWriteStream } = require('node:fs')
const unzipper = require('unzipper')

const zipFolder = async (folderPath, zipFilePath) => {
  const zipOutput = createWriteStream(zipFilePath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.directory(folderPath, false)
  archive.finalize()
  return pipeline(archive, zipOutput)
}

async function unzipFile (zipFile, outputFolder) {
  const directory = await unzipper.Open.file(zipFile)
  return directory.extract({ path: outputFolder })
}

module.exports = { zipFolder, unzipFile }
