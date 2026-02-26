'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { setTimeout: sleep } = require('node:timers/promises')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const createConnectionPool = require('@databases/pg')
const leaderPlugin = require('../plugins/leader')

const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/control_plane'

function buildApp (opts = {}) {
  const app = fastify({ logger: false })

  app.register(fp(async (app) => {
    app.decorate('env', {})
    app.decorate('platformatic', opts.platformatic)
  }, { name: 'env' }))

  app.register(leaderPlugin)
  return app
}

test('isControlPlaneLeader is decorated and returns false initially', async (t) => {
  process.env.PLT_CONTROL_PLANE_LEADER_POLL = '200'
  t.after(() => { delete process.env.PLT_CONTROL_PLANE_LEADER_POLL })

  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const app = buildApp({ platformatic: { db: pool } })
  await app.ready()
  t.after(async () => {
    await app.close()
    await pool.dispose()
  })

  assert.strictEqual(app.hasDecorator('isControlPlaneLeader'), true)
  assert.strictEqual(app.isControlPlaneLeader(), false)
})

test('isControlPlaneLeader becomes true after leader election', async (t) => {
  process.env.PLT_CONTROL_PLANE_LEADER_POLL = '200'
  t.after(() => { delete process.env.PLT_CONTROL_PLANE_LEADER_POLL })

  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const app = buildApp({ platformatic: { db: pool } })
  await app.ready()
  t.after(async () => {
    await app.close()
    await pool.dispose()
  })

  await sleep(500)
  assert.strictEqual(app.isControlPlaneLeader(), true)
})
