'use strict'

const fp = require('fastify-plugin')

const { S3Client, paginateListObjectsV2, GetObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const { open } = require('fs/promises')
const { createWriteStream } = require('fs')
const { pipeline } = require('stream/promises')
const { join, basename, resolve } = require('path')

class S3 {
  constructor (awsAccessKey, awsSecretAccessKey, awsRegion, awsBucket, logger) {
    this.s3 = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretAccessKey
      }
    })
    this.bucket = awsBucket
    this.logger = logger
  }

  async #uploadFile (filePath) {
    const fd = await open(filePath)
    const stream = fd.createReadStream()
    const fileName = basename(filePath)
    const params = { Bucket: this.bucket, Key: fileName, Body: stream }
    const upload = new Upload({ client: this.s3, params })
    return upload.done()
  }

  async #listTableKeys (lastImportedFile = null) {
    const allKeys = []
    const params = { Bucket: this.bucket }
    if (lastImportedFile) {
      params.StartAfter = lastImportedFile
    }
    for await (const data of paginateListObjectsV2({ client: this.s3 }, params)) {
      allKeys.push(...(data.Contents ?? []))
    }
    return allKeys
  }

  async #downloadFile (key, fileName) {
    const params = { Bucket: this.bucket, Key: key }
    const writeStream = createWriteStream(fileName)
    const { Body } = await this.s3.send(new GetObjectCommand(params))
    await pipeline(Body, writeStream)
  }

  async uploadFiles (files) {
    const uploadPromises = files.map(file => this.#uploadFile(file))
    const successfulUploads = []
    const res = await Promise.all(uploadPromises)
    for (const r of res) {
      const file = r.Key
      successfulUploads.push(file)
    }
    return successfulUploads
  }

  // Download files from S3 storage, filtering with the prefix, after (lexicograhically) the
  // lastImportedFile. Returns the list of successful downloaded files, with full path.
  // if prefix is falsy, it's ignored
  async downloadFiles (lastImportedFile, targetDir) {
    const keys = await this.#listTableKeys(lastImportedFile)
    const fileNames = keys.map(key => key.Key)
    const successfulDownloads = []
    const downloadPromises = []
    for await (const name of fileNames) {
      const fileName = resolve(join(targetDir, name))
      downloadPromises.push(this.#downloadFile(name, fileName))
    }
    const res = await Promise.allSettled(downloadPromises)
    for (let i = 0; i < res.length; i++) {
      if (res[i]?.status === 'fulfilled') {
        const file = resolve(join(targetDir, fileNames[i]))
        successfulDownloads.push(file)
      }
    }
    return successfulDownloads
  }

  async availableFiles (lastImportedFile) {
    const keys = await this.#listTableKeys(lastImportedFile)
    return keys.map(key => {
      return { fileName: key.Key, lastModified: key.LastModified, fileSize: key.Size }
    })
  }

  async getFileStream (fileName) {
    const params = { Bucket: this.bucket, Key: fileName }
    const { Body } = await this.s3.send(new GetObjectCommand(params))
    return Body
  }
}

const plugin = fp(async function (app) {
  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
    app.log.debug('Exporter/importer is disabled, not setting S3 storage')
    return
  }

  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE !== 's3') {
    app.log.debug('Exporter/importer on S3 storage is disabled')
    return
  }

  const s3 = new S3(
    app.env.PLT_RISK_COLD_STORAGE_AWS_ACCESS_KEY_ID,
    app.env.PLT_RISK_COLD_STORAGE_AWS_SECRET_ACCESS_KEY,
    app.env.PLT_RISK_COLD_STORAGE_AWS_REGION,
    app.env.PLT_RISK_COLD_STORAGE_AWS_BUCKET,
    app.log)
  app.decorate('storage', s3)
}, {
  dependencies: ['env']
})
module.exports = fp(plugin, {
  name: 's3',
  dependencies: ['env']
})
