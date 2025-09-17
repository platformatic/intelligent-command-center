'use strict'

const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const { buildServer: buildDbServer } = require('@platformatic/db')

const defaultEnv = {
  PLT_TRAFFIC_INSPECTOR_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/traffic_inspector',
  PLT_ICC_VALKEY_CONNECTION_STRING: 'redis://localhost:6343',
  PLT_CONTROL_PLANE: 'http://127.0.0.1:3042'
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startTrafficInspector (t, entities = {}, env = {}) {
  setUpEnvironment(env)

  const clientsDir = join(__dirname, '..', '..', '..', 'clients')
  const app = await buildDbServer({
    server: {
      hostname: '127.0.0.1',
      port: 3064,
      pluginTimeout: 30000,
      logger: { level: 'error' }
    },
    db: {
      connectionString: process.env.PLT_TRAFFIC_INSPECTOR_DATABASE_URL,
      events: false,
      openapi: {
        ignoreRoutes: [
          { method: 'POST', path: '/recommendations' },
          { method: 'POST', path: '/requests' }
        ]
      }
    },
    migrations: {
      dir: join(__dirname, '..', 'migrations'),
      autoApply: true
    },
    types: {
      autogenerate: true
    },
    plugins: {
      paths: [
        join(__dirname, '..', 'plugins'),
        join(__dirname, '..', 'routes')
      ]
    },
    clients: [
      {
        schema: join(clientsDir, 'control-plane', 'control-plane.openapi.json'),
        name: 'controlPlane',
        type: 'openapi',
        url: process.env.PLT_CONTROL_PLANE || 'http://127.0.0.1:3042'
      }
    ],
    watch: false
  })

  if (t !== null) {
    t.after(() => app.close())
  }

  const { db, sql } = app.platformatic

  await db.query(sql`DELETE FROM "route_examples"`)
  await db.query(sql`DELETE FROM "interceptor_configs"`)
  await db.query(sql`DELETE FROM "recommendations_routes"`)
  await db.query(sql`DELETE FROM "recommendations"`)

  await app.start()
  await app.redis.flushall()

  if (entities.versions?.length > 0) {
    for (const versionParams of entities.versions) {
      const { version } = versionParams
      await app.redis.set('traffic-inspector:versions', version)
    }
  }

  if (entities.domains) {
    const { domains } = entities.domains
    await app.redis.set(
      'traffic-inspector:domains', JSON.stringify(domains)
    )
  }

  if (entities.routes?.length > 0) {
    const promises = []
    for (const routeParams of entities.routes) {
      const { applicationId, telemetryId, url, route } = routeParams

      const routeKey = app.generateRouteKey(
        applicationId,
        telemetryId,
        url
      )
      const promise = app.redis.set(routeKey, route)
      promises.push(promise)
    }
    await Promise.all(promises)
  }

  if (entities.requestsHashes?.length > 0) {
    const promises = []
    for (const reqParams of entities.requestsHashes) {
      const promise = app.saveRequestHash(
        reqParams.applicationId,
        reqParams.timestamp,
        reqParams.request,
        reqParams.response
      )
      promises.push(promise)
    }
    await Promise.all(promises)
  }

  if (entities.requests?.length > 0) {
    const promises = []
    for (const request of entities.requests) {
      const promise = app.saveRequest(
        request.applicationId,
        request.request,
        request.response
      )
      promises.push(promise)
    }
    await Promise.all(promises)
  }

  if (entities.recommendations?.length > 0) {
    await app.platformatic.entities.recommendation.insert({
      inputs: entities.recommendations,
      skipAuth: true
    })
  }

  if (entities.recommendationsRoutes?.length > 0) {
    await app.platformatic.entities.recommendationsRoute.insert({
      inputs: entities.recommendationsRoutes,
      skipAuth: true
    })
  }

  if (entities.interceptorConfigs?.length > 0) {
    await app.platformatic.entities.interceptorConfig.insert({
      inputs: entities.interceptorConfigs,
      skipAuth: true
    })
  }

  if (entities.routeExamples?.length > 0) {
    await app.platformatic.entities.routeExample.insert({
      inputs: entities.routeExamples,
      skipAuth: true
    })
  }

  return app
}

function generateRequests (opts = {}) {
  const applicationId = opts.applicationId || randomUUID()

  const requests = []
  for (const params of opts.requests) {
    const counter = params.counter || 1
    const ttl = params.ttl ?? 100

    let timestamp = Date.now() - ttl * counter
    for (let i = 0; i < counter; i++) {
      requests.push({
        applicationId,
        request: { url: params.url },
        response: {
          bodySize: params.bodySize ?? 42,
          bodyHash: params.bodyHash ?? 'hash-42'
        },
        timestamp
      })

      timestamp += ttl
    }
  }

  return requests
}

function sortRoutes (r1, r2) {
  return r1.route.localeCompare(r2.route)
}

function sortRules (r1, r2) {
  return r1.routeToMatch.localeCompare(r2.routeToMatch)
}

function generateRecommendationRoute (route) {
  return {
    id: randomUUID(),
    route: '/products/:id',
    domain: 'service-1.plt-local',
    applicationId: randomUUID(),
    telemetryId: 'test-app-1-service-1',
    serviceName: 'service-1',
    recommended: true,
    selected: true,
    score: 0.74,
    ttl: 44,
    cacheTag: 'products',
    hits: 76,
    misses: 4,
    memory: 90,
    varyHeaders: JSON.stringify(['Accept']),
    ...route,
    scores: JSON.stringify({
      baseScore: 0.98,
      historyScore: 0.5,
      pastScoreAvg: 0.5,
      frequencyScore: 1,
      frequencyStats: { m2: 0, mean: 111.39, count: 1, stdDev: 0 },
      stabilityStats: { m2: 0, mean: 0.25, count: 1, stdDev: 0 },
      stabilityScore: 0.25,
      weightFrequency: 0.98,
      weightStability: 0.025,
      recommendationBonus: 0,
      scoresHistory: [{
        score: 0.74,
        frequency: 111.39,
        stability: 0.25,
        recommended: 1,
        requestCount: 80,
        timestamp: new Date().toISOString()
      }],
      ...route.scores
    })
  }
}

module.exports = {
  defaultEnv,
  startTrafficInspector,
  generateRequests,
  sortRoutes,
  sortRules,
  generateRecommendationRoute
}
