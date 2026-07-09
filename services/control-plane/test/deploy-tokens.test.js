'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const deployTokensPlugin = require('../plugins/deploy-tokens')
const deployTokensRoute = require('../routes/deploy-tokens')

const { routeAllowedForToken, isTokenScopedRoute } = deployTokensPlugin

const APP_ID = 'app-1'

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = opts.tokens || []
  const applications = opts.applications || { [APP_ID]: { id: APP_ID, name: 'my-app' } }
  let idCounter = 0

  app.register(fp(async (app) => {
    app.decorate('env', { PLT_CONTROL_PLANE_SECRET_KEYS: 'test-pepper' })
    app.decorate('getApplicationById', async (id) => applications[id] || null)
    app.decorate('platformatic', {
      entities: {
        deployToken: {
          find: async ({ where }) => {
            return store.filter(row => {
              for (const [key, condition] of Object.entries(where)) {
                if (condition.eq !== undefined && row[key] !== condition.eq) return false
              }
              return true
            })
          },
          save: async ({ input }) => {
            if (input.id) {
              const idx = store.findIndex(r => r.id === input.id)
              if (idx !== -1) {
                store[idx] = { ...store[idx], ...input }
                return store[idx]
              }
            }
            const row = { id: 't' + (++idCounter), createdAt: new Date().toISOString(), ...input }
            store.push(row)
            return row
          }
        }
      }
    })
  }, { name: 'mocks' }))

  app.register(deployTokensPlugin)
  app.register(deployTokensRoute)

  return { app, store }
}

const mockCtx = { logger: { info: () => {} }, req: { user: { username: 'alice' } } }

// ── pure: which routes a deploy token may reach ──

test('routeAllowedForToken allows deploy and read on the versions surface', () => {
  const base = `/control-plane/applications/${APP_ID}`
  assert.ok(routeAllowedForToken('GET', `${base}/versions`))
  assert.ok(routeAllowedForToken('GET', `${base}/versions/v1?x=1`))
  assert.ok(routeAllowedForToken('GET', `${base}/versions/v1/audit`))
  assert.ok(routeAllowedForToken('GET', `${base}/versions/v1/plan`))
  assert.ok(routeAllowedForToken('POST', `${base}/versions`)) // deploy create
  assert.ok(routeAllowedForToken('POST', `${base}/deploy`)) // ICC-owned deploy
  assert.ok(routeAllowedForToken('POST', `${base}/deploy?x=1`))
  assert.ok(routeAllowedForToken('POST', `${base}/deploy/plan`)) // read-only deploy plan
})

test('routeAllowedForToken allows the token-scoped routes (no application id in the path)', () => {
  // the token itself is the application scope
  assert.ok(routeAllowedForToken('POST', '/control-plane/deploy'))
  assert.ok(routeAllowedForToken('POST', '/control-plane/deploy?x=1'))
  assert.ok(routeAllowedForToken('POST', '/control-plane/deploy/plan'))
  assert.ok(routeAllowedForToken('GET', '/control-plane/versions/v1/actuation-plan'))
  // but not the mutating lifecycle routes, even token-scoped
  assert.ok(!routeAllowedForToken('POST', '/control-plane/versions/v1/expire'))
  assert.ok(!routeAllowedForToken('GET', '/control-plane/versions/v1/plan'))
})

test('isTokenScopedRoute matches only the app-less deploy and actuation-plan routes', () => {
  assert.ok(isTokenScopedRoute('POST', '/control-plane/deploy'))
  assert.ok(isTokenScopedRoute('POST', '/control-plane/deploy/plan'))
  assert.ok(isTokenScopedRoute('GET', '/control-plane/versions/v1/actuation-plan'))
  // an application id in the path is app-scoped, not token-scoped
  assert.ok(!isTokenScopedRoute('POST', `/control-plane/applications/${APP_ID}/deploy`))
  assert.ok(!isTokenScopedRoute('GET', `/control-plane/applications/${APP_ID}/versions/v1/actuation-plan`))
  // wrong method or a different app-less route
  assert.ok(!isTokenScopedRoute('GET', '/control-plane/deploy'))
  assert.ok(!isTokenScopedRoute('POST', '/control-plane/versions'))
})

test('routeAllowedForToken denies lifecycle, policy, token management, and unknown routes', () => {
  const base = `/control-plane/applications/${APP_ID}`
  // lifecycle decisions stay human (cookie), never a deploy token
  assert.ok(!routeAllowedForToken('POST', `${base}/versions/expire`))
  assert.ok(!routeAllowedForToken('POST', `${base}/versions/v1/promote`))
  assert.ok(!routeAllowedForToken('POST', `${base}/versions/v1/approve`))
  assert.ok(!routeAllowedForToken('POST', `${base}/versions/v1/reject`))
  assert.ok(!routeAllowedForToken('POST', `${base}/versions/v1/expire`))
  // policy admin, token management, and anything outside the versions surface
  assert.ok(!routeAllowedForToken('GET', `${base}/skew-protection/policy`))
  assert.ok(!routeAllowedForToken('PUT', `${base}/skew-protection/policy`))
  // actuation mode is a cookie/dashboard setting: a token cannot escalate its
  // own app from observe to manage
  assert.ok(!routeAllowedForToken('GET', `${base}/actuation-mode`))
  assert.ok(!routeAllowedForToken('PUT', `${base}/actuation-mode`))
  assert.ok(!routeAllowedForToken('POST', `${base}/deploy-tokens`))
  assert.ok(!routeAllowedForToken('GET', `${base}/deploy-tokens`))
  assert.ok(!routeAllowedForToken('DELETE', `${base}/deploy-tokens/t1`))
  assert.ok(!routeAllowedForToken('DELETE', `${base}/versions/v1`))
  assert.ok(!routeAllowedForToken('GET', '/control-plane/applications'))
})

// ── issue / verify / list / revoke ──

test('issueDeployToken returns a prefixed token and stores only its hash', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { token, record } = await app.issueDeployToken(APP_ID, { name: 'gha-prod' }, mockCtx)

  assert.ok(token.startsWith('plt_deploy_'))
  assert.strictEqual(store.length, 1)
  assert.strictEqual(store[0].name, 'gha-prod')
  assert.strictEqual(store[0].createdBy, 'alice')
  assert.strictEqual(store[0].scopes, undefined)
  assert.notStrictEqual(store[0].tokenHash, token)
  assert.ok(/^[a-f0-9]{64}$/.test(store[0].tokenHash))
  assert.strictEqual(record.name, 'gha-prod')
})

test('verifyDeployToken authorizes a deploy and yields a deploy-token principal', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { token } = await app.issueDeployToken(APP_ID, { name: 'gha' }, mockCtx)

  const ok = await app.verifyDeployToken(token, 'POST', `/control-plane/applications/${APP_ID}/versions`)
  assert.strictEqual(ok.authorized, true)
  assert.deepStrictEqual(ok.principal, {
    type: 'deploy-token',
    id: ok.principal.id,
    name: 'gha',
    applicationId: APP_ID
  })
})

test('verifyDeployToken authorizes the token-scoped routes and scopes from the token', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { token } = await app.issueDeployToken(APP_ID, { name: 'ci' }, mockCtx)

  // no application id in the path: the app comes from the token itself
  const deploy = await app.verifyDeployToken(token, 'POST', '/control-plane/deploy')
  assert.strictEqual(deploy.authorized, true)
  assert.strictEqual(deploy.principal.applicationId, APP_ID)

  assert.strictEqual((await app.verifyDeployToken(token, 'POST', '/control-plane/deploy/plan')).authorized, true)
  assert.strictEqual((await app.verifyDeployToken(token, 'GET', '/control-plane/versions/v1/actuation-plan')).authorized, true)

  // an app-less route that is not token-scoped is still rejected
  assert.strictEqual((await app.verifyDeployToken(token, 'GET', '/control-plane/versions')).reason, 'route-not-allowed')
})

test('verifyDeployToken rejects: wrong app, lifecycle/policy routes, unknown, revoked, expired, non-token', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { token } = await app.issueDeployToken(APP_ID, { name: 'gha' }, mockCtx)

  const wrongApp = await app.verifyDeployToken(token, 'GET', '/control-plane/applications/other-app/versions')
  assert.strictEqual(wrongApp.reason, 'application-mismatch')

  // lifecycle decision is not a deploy-token action
  const promote = await app.verifyDeployToken(token, 'POST', `/control-plane/applications/${APP_ID}/versions/v1/promote`)
  assert.strictEqual(promote.reason, 'route-not-allowed')

  const policyWrite = await app.verifyDeployToken(token, 'PUT', `/control-plane/applications/${APP_ID}/skew-protection/policy`)
  assert.strictEqual(policyWrite.reason, 'route-not-allowed')

  const tokenRoute = await app.verifyDeployToken(token, 'POST', `/control-plane/applications/${APP_ID}/deploy-tokens`)
  assert.strictEqual(tokenRoute.reason, 'route-not-allowed')

  assert.strictEqual((await app.verifyDeployToken('plt_deploy_nope', 'GET', `/control-plane/applications/${APP_ID}/versions`)).reason, 'unknown-token')
  assert.strictEqual((await app.verifyDeployToken('not-a-token', 'GET', '/x')).reason, 'not-a-deploy-token')

  store[0].revokedAt = new Date().toISOString()
  assert.strictEqual((await app.verifyDeployToken(token, 'GET', `/control-plane/applications/${APP_ID}/versions`)).reason, 'revoked')
  store[0].revokedAt = null

  store[0].expiresAt = new Date(Date.now() - 1000).toISOString()
  assert.strictEqual((await app.verifyDeployToken(token, 'GET', `/control-plane/applications/${APP_ID}/versions`)).reason, 'expired')
})

test('verifyDeployToken stamps last_used_at on success', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { token } = await app.issueDeployToken(APP_ID, { name: 'gha' }, mockCtx)
  assert.strictEqual(store[0].lastUsedAt, undefined)
  await app.verifyDeployToken(token, 'GET', `/control-plane/applications/${APP_ID}/versions`)
  assert.ok(store[0].lastUsedAt)
})

test('listDeployTokens never exposes the hash', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.issueDeployToken(APP_ID, { name: 'a' }, mockCtx)
  const list = await app.listDeployTokens(APP_ID)
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0].tokenHash, undefined)
  assert.strictEqual(list[0].name, 'a')
})

test('revokeDeployToken sets revokedAt; revoking an unknown token reports false', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.issueDeployToken(APP_ID, { name: 'a' }, mockCtx)
  const ok = await app.revokeDeployToken(APP_ID, store[0].id, mockCtx)
  assert.strictEqual(ok.revoked, true)
  assert.ok(store[0].revokedAt)

  const again = await app.revokeDeployToken(APP_ID, store[0].id, mockCtx)
  assert.strictEqual(again.revoked, false)

  const missing = await app.revokeDeployToken(APP_ID, 'nope', mockCtx)
  assert.strictEqual(missing.revoked, false)
})

// ── route contracts ──

test('POST /deploy-tokens issues once; GET lists; DELETE revokes', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const issued = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/deploy-tokens`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'gha-prod' })
  })
  assert.strictEqual(issued.statusCode, 200)
  const issuedBody = JSON.parse(issued.body)
  assert.ok(issuedBody.token.startsWith('plt_deploy_'))
  assert.strictEqual(issuedBody.deployToken.name, 'gha-prod')
  const tokenId = issuedBody.deployToken.id

  const list = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens` })
  assert.strictEqual(list.statusCode, 200)
  assert.strictEqual(JSON.parse(list.body).deployTokens.length, 1)

  const del = await app.inject({ method: 'DELETE', url: `/applications/${APP_ID}/deploy-tokens/${tokenId}` })
  assert.strictEqual(del.statusCode, 200)
  assert.strictEqual(JSON.parse(del.body).revoked, true)

  const delAgain = await app.inject({ method: 'DELETE', url: `/applications/${APP_ID}/deploy-tokens/${tokenId}` })
  assert.strictEqual(delAgain.statusCode, 404)
})

test('POST /deploy-tokens returns 404 for unknown app', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/applications/nope/deploy-tokens',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x' })
  })
  assert.strictEqual(res.statusCode, 404)
})

test('GET /deploy-tokens paginates and sorts server-side across all columns', async (t) => {
  const tokens = [
    { id: 't1', applicationId: APP_ID, name: 'aaa', createdBy: 'alice', createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null, revokedAt: null, lastUsedAt: null },
    { id: 't2', applicationId: APP_ID, name: 'ccc', createdBy: 'alice', createdAt: '2026-01-03T00:00:00.000Z', expiresAt: null, revokedAt: null, lastUsedAt: null },
    { id: 't3', applicationId: APP_ID, name: 'bbb', createdBy: 'alice', createdAt: '2026-01-02T00:00:00.000Z', expiresAt: null, revokedAt: '2026-01-04T00:00:00.000Z', lastUsedAt: null }
  ]
  const { app } = buildApp({ tokens })
  await app.ready()
  t.after(() => app.close())

  const names = (res) => JSON.parse(res.body).deployTokens.map((token) => token.name)

  // Default: newest first by createdAt, with totalCount.
  const def = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens` })
  assert.strictEqual(JSON.parse(def.body).totalCount, 3)
  assert.deepStrictEqual(names(def), ['ccc', 'bbb', 'aaa'])

  // Pagination slices server-side while reporting the full count.
  const page0 = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens?limit=2&offset=0` })
  assert.strictEqual(JSON.parse(page0.body).totalCount, 3)
  assert.deepStrictEqual(names(page0), ['ccc', 'bbb'])
  const page1 = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens?limit=2&offset=2` })
  assert.deepStrictEqual(names(page1), ['aaa'])

  // Sort by label.
  const byName = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens?sort=name&order=asc` })
  assert.deepStrictEqual(names(byName), ['aaa', 'bbb', 'ccc'])

  // Sort by the derived state: active before revoked.
  const byState = await app.inject({ url: `/applications/${APP_ID}/deploy-tokens?sort=state&order=asc` })
  const states = JSON.parse(byState.body).deployTokens.map((token) => (token.revokedAt ? 'revoked' : 'active'))
  assert.deepStrictEqual(states, ['active', 'active', 'revoked'])
})

test('POST /deploy-tokens/verify returns the authorization decision', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const issued = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/deploy-tokens`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'gha' })
  })
  const token = JSON.parse(issued.body).token

  const verify = await app.inject({
    method: 'POST',
    url: '/deploy-tokens/verify',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, method: 'POST', path: `/control-plane/applications/${APP_ID}/versions` })
  })
  assert.strictEqual(verify.statusCode, 200)
  const body = JSON.parse(verify.body)
  assert.strictEqual(body.authorized, true)
  assert.strictEqual(body.principal.type, 'deploy-token')
})
