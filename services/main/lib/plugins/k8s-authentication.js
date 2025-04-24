'use strict'

const { readFile } = require('node:fs/promises')
const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')
const buildJwks = require('get-jwks')
const { UnauthorizedError } = require('../errors')
const isUrlAllowed = require('../k8s-allowed-routes')
const { Agent } = require('undici')

async function plugin (app) {
  // The k8s HTTPs client uses the CA certificate to verify the server's certificate
  let k8sCaCert
  try {
    const caPath = app.config.K8S_CA_CERT_PATH
    k8sCaCert = await readFile(caPath)
  } catch (err) {
    app.log.warn({ err }, 'Unable to load K8s CA certificate')
  }
  const isCAAvailable = !!k8sCaCert

  const k8sToken = await app.getK8SJWTToken()
  if (!k8sToken) {
    app.log.warn('K8s authentication disabled: Unable to get K8S JWT token')
  }

  const fetchOptions = {
    headers: {
      Authorization: `Bearer ${k8sToken}`
    }
  }
  if (isCAAvailable) {
    const httpsAgent = new Agent({
      connect: {
        ca: k8sCaCert
      }
    })
    fetchOptions.dispatcher = httpsAgent
  }

  const getJwks = buildJwks({
    jwksPath: '/openid/v1/jwks',
    fetchOptions
  })

  app.register(fastifyJwt, {
    decode: { complete: true },
    secret: async (_request, token) => {
      const {
        header: { kid, alg },
        payload: { iss }
      } = token
      return getJwks
        .getPublicKey({ kid, domain: iss, alg })
    },
    verify: { algorithms: ['RS256'] }
  })

  app.decorate('k8sJWTAuth', async (request) => {
    const isAllowed = isUrlAllowed(request)
    if (!isAllowed) {
      app.log.warn({
        method: request.method,
        url: request.url
      }, 'K8s authentication denied: route not in whitelist')
      throw new UnauthorizedError('K8s authentication denied: route not in whitelist')
    }

    if (app.config.PLT_DISABLE_K8S_AUTH) {
      app.log.warn('K8s authentication disabled: PLT_DISABLE_K8S_AUTH is set')
      return
    }

    try {
      const undecoded = await request.jwtVerify()
      request.k8s = undecoded['kubernetes.io']
    } catch (err) {
      app.log.error({ err }, 'K8s JWT verification failed')
      throw new UnauthorizedError('K8s JWT verification failed')
    }
  })
}

plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'k8s-authentication',
  dependencies: ['k8s-token']
})
