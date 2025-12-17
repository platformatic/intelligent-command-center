'use strict'

const fp = require('fastify-plugin')
const { scanKeys } = require('../../../lib/redis-utils')

async function plugin (app) {
  const valkey = app.store.valkey

  app.decorate('getApplicationFlamegraphs', async (applicationId) => {
    const { db, sql } = app.platformatic

    const flamegraphs = await db.query(sql`
      SELECT
        f.id,
        f.application_id as "applicationId",
        f.service_id as "serviceId",
        f.pod_id as "podId",
        f.profile_type as "type",
        f.created_at as "createdAt",
        COUNT(a.id) as "alertsCount"
      FROM flamegraphs f
      LEFT JOIN alerts a ON f.id = a.flamegraph_id
      WHERE f.application_id = ${applicationId}
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `)

    return flamegraphs
  })

  app.decorate('getProfilingStates', async (applicationId) => {
    const pattern = `flamegraphs:state:{${applicationId}}:*`
    const keys = await scanKeys(valkey, pattern)

    if (keys.length === 0) {
      return []
    }

    // Use MGET for efficient batch retrieval
    // Hash tags ensure all keys are on same slot (AWS ElastiCache Cluster compatibility)
    const values = await valkey.mget(keys)

    const profilingStates = []
    for (const value of values) {
      if (value) {
        const states = JSON.parse(value)
        profilingStates.push(...states)
      }
    }
    return profilingStates
  })

  app.decorate('saveProfilingStates', async (applicationId, podId, expiresIn, states) => {
    for (const state of states) {
      state.podId = podId
    }

    const key = generateProfilingStateKey(applicationId, podId)
    const value = JSON.stringify(states)
    // Atomically set with expiration (convert milliseconds to seconds)
    const expiresInSeconds = Math.ceil(expiresIn / 1000)
    await valkey.set(key, value, 'EX', expiresInSeconds)
  })

  function generateProfilingStateKey (applicationId, podId) {
    // Hash tags {applicationId} ensure all pods for same app are on same Redis slot
    // This allows MGET to work in cluster mode (AWS ElastiCache)
    return `flamegraphs:state:{${applicationId}}:${podId}`
  }
}

module.exports = fp(plugin, {
  name: 'flamegraphs',
  dependencies: ['env', 'store']
})
