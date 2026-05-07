'use strict'

const { readFile } = require('node:fs/promises')
const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')
const buildJwks = require('get-jwks')
const { UnauthorizedError } = require('../errors')
const isUrlAllowed = require('../machine-allowed-routes')
const { Agent } = require('undici')

async function plugin (app) {
  // ── Provider detection ────────────────────────────────────────────────
  const provider = app.config.PLT_MACHINIST_PROVIDER || 'k8s'
  app.log.info({ provider }, 'Initializing machine authentication')

  // ── K8s strategy: existing JWT verification ───────────────────────────
  // Verifies a K8s service account JWT using JWKS published by the cluster's
  // API server. Extracts pod name + namespace from the `kubernetes.io` claim.
  async function setupK8sStrategy () {
    let k8sCaCert
    try {
      const caPath = app.config.K8S_CA_CERT_PATH
      k8sCaCert = await readFile(caPath)
      app.log.debug({ caPath }, 'Loaded CA cert for K8s authentication')
    } catch (err) {
      app.log.warn({ err }, 'Unable to load K8s CA certificate')
    }

    const jwksFetchOpt = {}
    const k8sToken = await app.getK8SJWTToken()
    if (k8sToken) {
      jwksFetchOpt.headers = { Authorization: `Bearer ${k8sToken}` }

      const encodedPayload = k8sToken.split('.')[1]
      const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString())

      if (decodedPayload.iss.includes('kubernetes.default.svc')) {
        jwksFetchOpt.dispatcher = new Agent({ connect: { ca: k8sCaCert } })
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
          payload: { iss }
        } = token
        return getJwks.getPublicKey({ kid, alg, domain: iss })
      },
      verify: { algorithms: ['RS256'] }
    })

    return async function k8sVerify (request) {
      const undecoded = await request.jwtVerify()
      const claim = undecoded['kubernetes.io']
      return {
        machineId: claim.pod?.name,
        namespace: claim.namespace
      }
    }
  }

  // ── ECS strategy: trust the headers (verification TODO) ───────────────
  // Watt-extra in an ECS task reads its own identity from the task metadata
  // endpoint and sends it as headers. Currently we trust them as-is. Future
  // hardening: verify with Sigv4-presigned sts:GetCallerIdentity, at which
  // point this transport may be replaced by an Authorization-bearer token
  // carrying the signed proof.
  function setupEcsStrategy () {
    const HEADER_TASK_ID = 'x-ecs-task-id'
    const HEADER_CLUSTER = 'x-ecs-cluster'

    return async function ecsVerify (request) {
      const machineId = request.headers[HEADER_TASK_ID]
      const namespace = request.headers[HEADER_CLUSTER]

      if (!machineId || !namespace) {
        throw new UnauthorizedError(
          `Missing ${HEADER_TASK_ID} or ${HEADER_CLUSTER} headers`
        )
      }
      return { machineId, namespace }
    }
  }

  let verify
  if (provider === 'ecs') {
    verify = setupEcsStrategy()
  } else {
    verify = await setupK8sStrategy()
  }

  // ── Public decorator ──────────────────────────────────────────────────
  app.decorate('machineAuth', async (request) => {
    const isAllowed = isUrlAllowed(request)
    if (!isAllowed) {
      app.log.warn({
        method: request.method, url: request.url
      }, 'Machine authentication denied: route not in whitelist')
      throw new UnauthorizedError('Machine authentication denied: route not in whitelist')
    }

    if (app.config.PLT_DISABLE_MACHINE_AUTH) {
      app.log.warn('Machine authentication disabled: PLT_DISABLE_MACHINE_AUTH is set')
      return
    }

    try {
      const { machineId, namespace } = await verify(request)
      request.context = { machineId, namespace }
      request.headers['x-plt-machine-id'] = machineId
      request.headers['x-plt-machine-namespace'] = namespace
    } catch (err) {
      app.log.error({ err, url: request.url }, 'Machine authentication failed')
      if (err instanceof UnauthorizedError) throw err
      throw new UnauthorizedError('Machine authentication failed')
    }
  })
}

plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'machine-authentication',
  dependencies: ['k8s-token']
})
