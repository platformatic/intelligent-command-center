'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const { shouldExpire, forceExpire } = require('../../lib/expire-policies/workflow')

const mockLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
}

async function startMockWorkflow (statusResponse, calls) {
  const app = fastify({ logger: false })

  app.get('/api/v1/apps/:appId/versions/:depId/status', async (req, reply) => {
    calls.statusCalls = (calls.statusCalls || 0) + 1
    calls.lastStatusParams = req.params
    if (statusResponse === null) {
      return reply.code(500).send('internal error')
    }
    return statusResponse
  })

  app.post('/api/v1/apps/:appId/versions/:depId/expire', async (req) => {
    calls.expireCalls = (calls.expireCalls || 0) + 1
    calls.lastExpireParams = req.params
    return { ok: true }
  })

  await app.listen({ port: 0 })
  const port = app.server.address().port
  return { app, port, workflowUrl: `http://127.0.0.1:${port}` }
}

function makeVersion () {
  return {
    appLabel: 'my-app',
    versionLabel: 'v1'
  }
}

test('shouldExpire returns true when RPS is 0 and no active workflow work', async (t) => {
  const calls = {}
  const { app, workflowUrl } = await startMockWorkflow({
    activeRuns: 0, pendingHooks: 0, pendingWaits: 0, queuedMessages: 0
  }, calls)
  t.after(() => app.close())

  const getVersionRPS = async () => 0
  const result = await shouldExpire(makeVersion(), { getVersionRPS, log: mockLog, workflowUrl })

  assert.strictEqual(result, true)
  assert.ok(calls.statusCalls > 0)
  assert.strictEqual(calls.lastStatusParams.appId, 'my-app')
  assert.strictEqual(calls.lastStatusParams.depId, 'v1')
})

test('shouldExpire returns false when active workflow work exists', async (t) => {
  const calls = {}
  const { app, workflowUrl } = await startMockWorkflow({
    activeRuns: 3, pendingHooks: 0, pendingWaits: 0, queuedMessages: 0
  }, calls)
  t.after(() => app.close())

  const getVersionRPS = async () => 0
  const result = await shouldExpire(makeVersion(), { getVersionRPS, log: mockLog, workflowUrl })

  assert.strictEqual(result, false)
  assert.ok(calls.statusCalls > 0)
})

test('shouldExpire returns false when RPS > 0', async (t) => {
  const calls = {}
  const { app, workflowUrl } = await startMockWorkflow({
    activeRuns: 0, pendingHooks: 0, pendingWaits: 0, queuedMessages: 0
  }, calls)
  t.after(() => app.close())

  const getVersionRPS = async () => 10
  const result = await shouldExpire(makeVersion(), { getVersionRPS, log: mockLog, workflowUrl })

  assert.strictEqual(result, false)
  assert.strictEqual(calls.statusCalls || 0, 0)
})

test('shouldExpire returns false when workflow status request fails', async (t) => {
  const calls = {}
  const { app, workflowUrl } = await startMockWorkflow(null, calls)
  t.after(() => app.close())

  const getVersionRPS = async () => 0
  const result = await shouldExpire(makeVersion(), { getVersionRPS, log: mockLog, workflowUrl })

  assert.strictEqual(result, false)
  assert.ok(calls.statusCalls > 0)
})

test('shouldExpire returns false when workflowUrl is not set', async (t) => {
  const getVersionRPS = async () => 0
  const result = await shouldExpire(makeVersion(), { getVersionRPS, log: mockLog })

  assert.strictEqual(result, false)
})

test('forceExpire calls POST /expire on the workflow service', async (t) => {
  const calls = {}
  const { app, workflowUrl } = await startMockWorkflow(null, calls)
  t.after(() => app.close())

  await forceExpire(makeVersion(), { log: mockLog, workflowUrl })

  assert.strictEqual(calls.expireCalls, 1)
  assert.strictEqual(calls.lastExpireParams.appId, 'my-app')
  assert.strictEqual(calls.lastExpireParams.depId, 'v1')
})

test('forceExpire does nothing when workflowUrl is not set', async (t) => {
  await forceExpire(makeVersion(), { log: mockLog })
})
