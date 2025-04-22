'use strict'

const { readFileSync } = require('node:fs')
const fp = require('fastify-plugin')
const { default: fastifyJwt } = require('@fastify/jwt')
const getJwks = require('get-jwks')

async function plugin (app) {
  let k8sCaCert
  try {
    k8sCaCert = readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
  } catch (err) {
    app.log.warn({ err }, 'K8s authentication disabled: Unable to load K8s CA certificate')
    return
  }

  const k8sToken = app.getK8SJWTToken()
  if (!k8sToken) {
    app.log.warn('K8s authentication disabled: Unable to get K8S JWT token')
    return
  }

  // These MUST be taken from the environment variables, must not be setup in the ICC `.env`
  const k8sHost = process.env.KUBERNETES_SERVICE_HOST
  const k8sPort = process.env.KUBERNETES_SERVICE_PORT_HTTPS

  if (!k8sHost || !k8sPort) {
    app.log.warn('K8s authentication disabled: KUBERNETES_SERVICE_HOST or KUBERNETES_SERVICE_PORT_HTTPS not set')
    return
  }

  const jwksUrl = `https://${k8sHost}:${k8sPort}/openid/v1/jwks`

  // Initialize get-jwks with K8s token and CA certificate
  const jwks = getJwks({
    jwksUri: jwksUrl,
    cache: true,
    cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${k8sToken}`
      },
      dispatcher: {
        // Add CA certificate to the HTTPS request
        tls: {
          ca: k8sCaCert
        }
      }
    }
  })

  // Register fastify-jwt with get-jwks for key resolution
  app.register(fastifyJwt, {
    secret: (_request, token) => {
      const { header: { kid, alg } } = token
      return jwks.getPublicKey({ kid, alg })
    },
    verify: { algorithms: ['RS256'] }
  })

  // Add a preHandler hook to validate JWT tokens for K8s pod-to-pod communication
  app.decorate('k8sJWTAuth', async (request, _reply) => {
    try {
      await request.jwtVerify()
      // add the whole k8s object to the request
      request.k8s = request['kubernetes.io']
    } catch (err) {
      app.log.debug({ err }, 'K8s JWT verification failed')
      throw new Error('K8s JWT verification failed')
    }
  })
}

plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'k8s-authentication',
  dependencies: ['k8s-token']
})
