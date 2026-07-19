'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { writeFile, mkdir, rm } = require('node:fs/promises')
const path = require('node:path')
const fastify = require('fastify')
const configPlugin = require('../../lib/plugins/config')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const workflowRoutes = require('../../lib/routes/workflow')
const { encodeJwtPayload, setUpEnvironment } = require('../helper')

const testDir = path.join(__dirname, 'test-workflow-proxy')
const tokenPath = path.join(testDir, 'token')

async function startUpstream (t) {
  const upstream = fastify()
  let seenAuth = null
  upstream.get('/api/v1/apps/:appId/runs', async (request) => {
    seenAuth = request.headers.authorization
    return { data: [] }
  })
  await upstream.listen({ host: '127.0.0.1', port: 0 })
  t.after(() => upstream.close())
  return { url: `http://127.0.0.1:${upstream.server.address().port}`, getAuth: () => seenAuth }
}

async function buildProxy (t, workflowUrl) {
  setUpEnvironment({ K8S_TOKEN_PATH: tokenPath, PLT_WORKFLOW_URL: workflowUrl })
  const app = fastify()
  await app.register(configPlugin)
  await app.register(k8sTokenPlugin)
  await app.register(workflowRoutes)
  t.after(() => app.close())
  return app
}

test('proxy forwards a token refreshed after startup, not the expired cached one', async (t) => {
  await mkdir(testDir, { recursive: true })
  t.after(() => rm(testDir, { recursive: true, force: true }))

  const upstream = await startUpstream(t)

  // Token loaded at startup is already expired (as happens on a long-lived pod).
  const expired = encodeJwtPayload(Math.floor(Date.now() / 1000) - 100)
  await writeFile(tokenPath, expired)

  const app = await buildProxy(t, upstream.url)

  // The kubelet rotates the projected token on disk to a fresh one.
  const fresh = encodeJwtPayload(Math.floor(Date.now() / 1000) + 3600)
  await writeFile(tokenPath, fresh)

  const res = await app.inject({ method: 'GET', url: '/workflow/apps/demo/runs?limit=10' })

  assert.equal(res.statusCode, 200)
  assert.equal(upstream.getAuth(), `Bearer ${fresh}`, 'proxy must send the rotated token')
  assert.notEqual(upstream.getAuth(), `Bearer ${expired}`, 'proxy must not send the expired token')
})
