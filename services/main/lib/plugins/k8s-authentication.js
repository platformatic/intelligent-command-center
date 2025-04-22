'use strict'

const { readFile } = require('node:fs/promises')
const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')
const buildJwks = require('get-jwks')
const { UnauthorizedError } = require('../errors')

async function plugin (app) {
  // The k8s HTTPs client uses the CA certificate to verify the server's certificate
  let k8sCaCert
  try {
    k8sCaCert = await readFile('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
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
    fetchOptions.dispatcher = {
      tls: {
        ca: k8sCaCert
      }
    }
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
