'use strict'

const { Redis } = require('iovalkey')
const assert = require('node:assert/strict')
const { join } = require('node:path')
const { once } = require('node:events')
const { createServer } = require('node:http')
const { setTimeout: sleep } = require('node:timers/promises')
const { Client, interceptors } = require('undici')
const { buildServer } = require('@platformatic/service')
const { loadConfig, buildServer: buildRuntimeServer } = require('@platformatic/runtime')
const RedisCacheStore = require('undici-cache-redis')

const defaultEnv = {
  PLT_FEATURE_CACHE: true,
  PLT_APPLICATIONS_VALKEY_CONNECTION_STRING: 'redis://127.0.0.1:6342'
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startCacheManager (t, env = {}) {
  setUpEnvironment(env)
  await cleanValkey()

  const app = await buildServer({
    server: {
      hostname: '127.0.0.1',
      port: 3001,
      logger: { level: 'fatal' },
      maxParamLength: 1000
    },
    plugins: {
      paths: [
        join(__dirname, '..', 'plugins'),
        join(__dirname, '..', 'routes')
      ]
    },
    watch: false
  })

  await app.start()
  t.after(() => app.close())

  return app
}

async function generateRequests (t, keyPrefix, requests) {
  const server = createServer((req, res) => {
    res.setHeader('cache-control', 'public, s-maxage=10000')

    const cacheTags = req.headers['x-cache-tags']
    if (cacheTags) {
      res.setHeader('x-cache-tags', cacheTags)
    }

    res.end('asd')
  }).listen(0)

  await once(server, 'listening')

  const url = new URL(
    defaultEnv.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING
  )
  const store = new RedisCacheStore({
    clientOpts: {
      keyPrefix,
      host: url.hostname,
      port: url.port,
      password: url.password,
      username: url.username
    },
    cacheTagsHeader: 'x-cache-tags',
    errorCallback: (err) => assert.fail(err)
  })
  const origin = `http://localhost:${server.address().port}`
  const client = new Client(origin).compose(interceptors.cache({ store }))

  t.after(async () => {
    server.close()
    store.close()
    client.close()
  })

  const entries = []
  const promises = [sleep(1000)]
  for (const { method, path, cacheTags } of requests) {
    const headers = {}
    if (cacheTags && cacheTags.length > 0) {
      headers['x-cache-tags'] = cacheTags.join(',')
    }

    promises.push(
      client
        .request({ origin, method, path, headers })
        .then(async ({ statusCode, headers, body }) => {
          const data = await body.text()
          entries.push({
            origin,
            method,
            path,
            statusCode,
            headers,
            body: data
          })
        })
    )
  }

  await Promise.all(promises)
  return entries
}

async function startNextCacheApp (t, keyPrefix) {
  const projectDir = join(__dirname, 'fixtures', 'next-cache')

  const runtimeConfigPath = join(projectDir, 'platformatic.json')
  const env = {
    ...process.env,
    PLT_NEXT_CACHE_REDIS_URL: defaultEnv.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING,
    PLT_NEXT_CACHE_REDIS_PREFIX: keyPrefix
  }

  const { configManager, args } = await loadConfig(
    {}, ['-c', runtimeConfigPath, '--production'], { env }
  )
  configManager.args = args

  const nextCacheApp = await buildRuntimeServer({ configManager, env })
  await nextCacheApp.buildService('frontend')
  nextCacheApp.url = await nextCacheApp.start()

  t.after(() => nextCacheApp.close())

  return nextCacheApp
}

function sortEntries (e1, e2) {
  return e1.key.localeCompare(e2.key)
}

async function cleanValkey () {
  const redis = new Redis(defaultEnv.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING)
  await redis.flushall()
  redis.quit()
}

module.exports = {
  startCacheManager,
  startNextCacheApp,
  generateRequests,
  sortEntries
}
