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
    app.log.debug({ caPath, k8sCaCert }, 'Loading cert for K8s authentication')
  } catch (err) {
    app.log.warn({ err }, 'Unable to load K8s CA certificate')
  }

  const jwksFetchOpt = {}

  const k8sToken = await app.getK8SJWTToken()
  if (k8sToken) {
    jwksFetchOpt.headers = {
      Authorization: `Bearer ${k8sToken}`
    }

    const encodedPayload = k8sToken.split('.')[1]
    const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString())

    // The assumption is that the local token is issued by the same service
    // as the incoming token
    if (decodedPayload.iss.includes('kubernetes.default.svc')) {
      jwksFetchOpt.dispatcher = new Agent({
        connect: {
          ca: k8sCaCert
        }
      })
    }
  } else {
    app.log.warn('K8s authentication disabled: Unable to get K8S JWT token')
  }

  const getJwks = buildJwks({
    providerDiscovery: true,
    fetchOptions: jwksFetchOpt
  })

  app.register(fastifyJwt, {
    decode: { complete: true },
    secret: async (_request, token) => {
      const {
        header: { kid, alg },

        // If this issuer (incoming token) is different from the ICC token,
        // we might not be able to get the public key
        payload: { iss }
      } = token

      return getJwks
        .getPublicKey({ kid, alg, domain: iss })
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
      request.headers['x-k8s'] = JSON.stringify(request.k8s)
    } catch (err) {
      app.log.error({ err, url: request.url }, 'K8s JWT verification failed')
      throw new UnauthorizedError('K8s JWT verification failed')
    }
  })
}

plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'k8s-authentication',
  dependencies: ['k8s-token']
})
