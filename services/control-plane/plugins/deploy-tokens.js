'use strict'

const crypto = require('node:crypto')
const fp = require('fastify-plugin')

const TOKEN_PREFIX = 'plt_deploy_'

// HMAC-SHA256 with a server-side pepper (the control-plane secret) rather than a
// bare hash: a leak of the tokens table alone cannot verify a token without the
// pepper. The token is already 256-bit random, so no per-row salt is needed (and
// one would break hash-as-lookup anyway, since the hash is the lookup key).
function hashToken (token, pepper) {
  return crypto.createHmac('sha256', pepper).update(token).digest('hex')
}

function generateToken () {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url')
}

// A token-scoped route carries no application id in the path: the token is
// itself the application scope, so ICC resolves the app from the token instead
// of from the URL. This is the CI-facing surface -- a customer's pipeline holds
// only the token (one secret) plus image/version, and never has to look up the
// application UUID. Currently the deploy and read-only plan routes:
//   POST .../deploy, POST .../deploy/plan, GET .../versions/:v/actuation-plan
function isTokenScopedRoute (method, path) {
  const p = path.split('?')[0]
  if (/\/applications\//.test(p)) return false
  if (method === 'POST' && /(^|\/)deploy(\/plan)?$/.test(p)) return true
  if (method === 'GET' && /(^|\/)versions\/[^/]+\/actuation-plan$/.test(p)) return true
  return false
}

// A deploy token is for deploying and reading version status on its bound
// application. It may create a workload (POST .../deploy), read the versions
// surface (GET: list / detail / plan / audit), and create a new version
// (POST .../versions), and nothing else. The same routes are also reachable
// token-scoped (no application id in the path) via isTokenScopedRoute. The
// lifecycle decisions (promote, approve, reject, expire) and the policy routes
// stay human (cookie) -- keeping approve/reject human preserves the approval
// gate -- and the token-management routes are never token-authorizable. The
// path may carry a `/control-plane` proxy prefix and a query string; both are
// tolerated.
function routeAllowedForToken (method, path) {
  const p = path.split('?')[0]

  if (/\/deploy-tokens(\/|$)/.test(p)) return false

  if (isTokenScopedRoute(method, p)) return true

  // ICC-owned deploy: create a versioned workload, or read its plan (read-only).
  if (method === 'POST' && /\/applications\/[^/]+\/deploy(\/plan)?$/.test(p)) return true

  if (!/\/applications\/[^/]+\/versions/.test(p)) return false

  if (method === 'GET') return true // read: list / detail / plan / audit
  if (method === 'POST' && /\/applications\/[^/]+\/versions$/.test(p)) return true // deploy
  return false
}

function appIdFromPath (path) {
  const m = path.split('?')[0].match(/\/applications\/([^/]+)/)
  return m ? m[1] : null
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  // Server-side pepper for the token HMAC (see hashToken). Stable across restarts
  // so a token issued before a restart still verifies.
  const pepper = app.env.PLT_CONTROL_PLANE_SECRET_KEYS

  /**
   * Issue a new deploy token for an application. The plaintext token is returned
   * once and never stored; only its sha-256 hash is persisted.
   *
   * @returns {{ token: string, record: object }}
   */
  app.decorate('issueDeployToken', async (applicationId, opts, ctx) => {
    const { entities } = app.platformatic

    const token = generateToken()
    const record = await entities.deployToken.save({
      input: {
        applicationId,
        name: opts.name,
        tokenHash: hashToken(token, pepper),
        createdBy: ctx?.req?.user?.username ?? null,
        expiresAt: opts.expiresAt ?? null
      }
    })

    ctx?.logger?.info({ applicationId, tokenId: record.id, name: opts.name }, 'issued deploy token')
    return { token, record }
  })

  app.decorate('listDeployTokens', async (applicationId) => {
    const { entities } = app.platformatic
    const where = { applicationId: { eq: applicationId } }
    // Return every token: the route sorts by a computed state and paginates over
    // the full set, so it needs all of them. Page the DB in chunks so sql-mapper's
    // default LIMIT 10 does not silently drop any. Newest first.
    const rows = []
    const pageSize = 100
    for (let offset = 0; ; offset += pageSize) {
      const page = await entities.deployToken.find({
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: pageSize,
        offset
      })
      rows.push(...page)
      if (page.length < pageSize) break
    }
    // Never expose the hash.
    return rows.map(({ tokenHash, ...rest }) => rest)
  })

  app.decorate('revokeDeployToken', async (applicationId, tokenId, ctx) => {
    const { entities } = app.platformatic
    const rows = await entities.deployToken.find({
      where: { id: { eq: tokenId }, applicationId: { eq: applicationId } }
    })
    if (rows.length === 0 || rows[0].revokedAt) {
      return { revoked: false }
    }
    await entities.deployToken.save({
      input: { id: tokenId, revokedAt: new Date().toISOString() }
    })
    ctx?.logger?.info({ applicationId, tokenId }, 'revoked deploy token')
    return { revoked: true }
  })

  /**
   * Resolve a deploy token to an authorized principal for a given request, or
   * report why it is not authorized. Never throws: the caller (gateway) decides
   * how to respond.
   *
   * @returns {{ authorized: boolean, reason?: string, principal?: object }}
   */
  app.decorate('verifyDeployToken', async (token, method, path) => {
    if (typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) {
      return { authorized: false, reason: 'not-a-deploy-token' }
    }

    const { entities } = app.platformatic
    const rows = await entities.deployToken.find({
      where: { tokenHash: { eq: hashToken(token, pepper) } }
    })
    if (rows.length === 0) return { authorized: false, reason: 'unknown-token' }

    const record = rows[0]
    if (record.revokedAt) return { authorized: false, reason: 'revoked' }
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { authorized: false, reason: 'expired' }
    }

    if (!routeAllowedForToken(method, path)) return { authorized: false, reason: 'route-not-allowed' }

    // App-scoped path: the id in the URL must match the token's app. Token-scoped
    // path: there is no id in the URL, so the token's own app is the scope.
    const appId = appIdFromPath(path)
    if (appId) {
      if (appId !== record.applicationId) return { authorized: false, reason: 'application-mismatch' }
    } else if (!isTokenScopedRoute(method, path)) {
      return { authorized: false, reason: 'no-application-scope' }
    }

    // Best-effort last-used stamp; never block the request on it.
    await entities.deployToken.save({
      input: { id: record.id, lastUsedAt: new Date().toISOString() }
    }).catch((err) => app.log.warn({ err, tokenId: record.id }, 'failed to stamp deploy-token lastUsedAt'))

    return {
      authorized: true,
      principal: {
        type: 'deploy-token',
        id: record.id,
        name: record.name,
        applicationId: record.applicationId
      }
    }
  })
}, {
  name: 'deploy-tokens'
})

module.exports.routeAllowedForToken = routeAllowedForToken
module.exports.isTokenScopedRoute = isTokenScopedRoute
