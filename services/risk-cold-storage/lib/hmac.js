'use strict'

const crypto = require('node:crypto')
const { createReadStream } = require('node:fs')
const { pipeline } = require('node:stream/promises')

const calculateHMAC = async (filePath, secretKey) => {
  const hmac = crypto.createHmac('sha256', secretKey)
  const readStream = createReadStream(filePath)
  await pipeline(readStream, hmac)
  return hmac.read().toString('hex')
}

const verifyHMAC = async (filePah, secretKey, hmac) => {
  const hmacToVerify = await calculateHMAC(filePah, secretKey)
  if (hmac !== hmacToVerify) {
    throw new Error('HMAC verification failed')
  }
  return true
}

module.exports = { calculateHMAC, verifyHMAC }
