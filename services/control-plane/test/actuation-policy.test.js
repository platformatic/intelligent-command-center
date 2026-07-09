'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const actuationPolicy = require('../plugins/actuation-policy')

function buildApp (rows = []) {
  const app = fastify({ logger: false })
  const store = rows.slice()
  const saved = []

  app.register(fp(async () => {}, { name: 'env' }))
  app.decorate('platformatic', {
    entities: {
      skewProtectionPolicy: {
        find: async ({ where }) => store.filter(r => r.applicationId === where.applicationId.eq),
        save: async ({ input }) => {
          saved.push(input)
          return { ...input }
        }
      }
    }
  })
  app.register(actuationPolicy)
  return { app, saved }
}

test('resolveActuationMode defaults to observe when no row exists', async (t) => {
  const { app } = buildApp([])
  await app.ready()
  t.after(() => app.close())
  assert.deepStrictEqual(await app.resolveActuationMode('app-1'), { mode: 'observe' })
})

test('resolveActuationMode returns the stored mode', async (t) => {
  const { app } = buildApp([{ id: 'p1', applicationId: 'app-1', mode: 'manage' }])
  await app.ready()
  t.after(() => app.close())
  assert.deepStrictEqual(await app.resolveActuationMode('app-1'), { mode: 'manage' })
})

test('resolveActuationMode defaults to observe when the row has a null mode', async (t) => {
  const { app } = buildApp([{ id: 'p1', applicationId: 'app-1', mode: null }])
  await app.ready()
  t.after(() => app.close())
  assert.deepStrictEqual(await app.resolveActuationMode('app-1'), { mode: 'observe' })
})

test('saveActuationMode inserts a new row when none exists', async (t) => {
  const { app, saved } = buildApp([])
  await app.ready()
  t.after(() => app.close())
  await app.saveActuationMode('app-1', 'manage')
  assert.strictEqual(saved.length, 1)
  assert.strictEqual(saved[0].applicationId, 'app-1')
  assert.strictEqual(saved[0].mode, 'manage')
  assert.strictEqual(saved[0].id, undefined)
})

test('saveActuationMode updates the existing row (upsert by id)', async (t) => {
  const { app, saved } = buildApp([{ id: 'p1', applicationId: 'app-1', mode: 'observe' }])
  await app.ready()
  t.after(() => app.close())
  await app.saveActuationMode('app-1', 'advise')
  assert.strictEqual(saved[0].id, 'p1')
  assert.strictEqual(saved[0].mode, 'advise')
})

test('saveActuationMode rejects an invalid mode', async (t) => {
  const { app } = buildApp([])
  await app.ready()
  t.after(() => app.close())
  await assert.rejects(() => app.saveActuationMode('app-1', 'bogus'), /Invalid versioning mode/)
})
