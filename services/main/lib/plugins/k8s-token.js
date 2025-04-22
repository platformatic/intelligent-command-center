'use strict'

const { readFile, stat } = require('node:fs/promises')
const fp = require('fastify-plugin')

function decodeJwtPayload (token) {
  try {
    if (!token) return null
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (err) {
    return null
  }
}

function isTokenExpired (token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true

  // Check if token is expired
  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp <= currentTime
}

async function plugin (app) {
  let token
  async function loadToken () {
    const tokenPath = process.env.K8S_TOKEN_PATH || // This is for testing purposes only, that's why is not in the config
          '/var/run/secrets/kubernetes.io/serviceaccount/token'
    try {
      await stat(tokenPath)
      app.log.info('Loading JWT token from K8s service account')
      token = await readFile(tokenPath, 'utf8')
    } catch (err) {
      app.log.error('Failed to load JWT token from K8s service account')
    }

    if (!token) {
      app.log.warn('K8s token not found, falling back to environment variable')
      token = process.env.PLT_TEST_TOKEN
    }

    return token
  }

  const getK8SJWTToken = async () => {
    if (isTokenExpired(token) || !token) {
      app.log.info('JWT token expired or not loaded, loading from K8s service account')
      token = await loadToken()
    }
    return token
  }

  app.decorate('getK8SJWTToken', getK8SJWTToken)
  token = await loadToken()
}

module.exports = fp(plugin, {
  name: 'k8s-token',
  dependencies: []
})
