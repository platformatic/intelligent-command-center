'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const Redis = require('iovalkey')
const {
  buildServer,
  cleanValkeyData,
  valkeyConnectionString
} = require('../helper')

test('saveProfilingStates and getProfilingStates work with expiresIn', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const expiresIn = 15000 // 15 seconds
  const states = [
    { isProfiling: true, isPaused: false, profileType: 'cpu' },
    { isProfiling: true, isPaused: false, profileType: 'heap' }
  ]

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Save states with expiresIn
  await server.saveProfilingStates(applicationId, podId, expiresIn, states)

  // Verify data was saved to Valkey with correct TTL
  const redis = new Redis(valkeyConnectionString)
  const key = `flamegraphs:state:{${applicationId}}:${podId}`
  const value = await redis.get(key)
  const ttl = await redis.ttl(key)
  await redis.quit()

  assert.ok(value)
  const savedStates = JSON.parse(value)
  assert.strictEqual(savedStates.length, 2)
  assert.strictEqual(savedStates[0].podId, podId)
  assert.strictEqual(savedStates[0].isProfiling, true)
  assert.strictEqual(savedStates[0].isPaused, false)
  assert.strictEqual(savedStates[0].profileType, 'cpu')

  // Verify TTL is approximately 15 seconds (allowing for execution time)
  assert.ok(ttl > 10 && ttl <= 15, `Expected TTL to be between 10-15, got ${ttl}`)

  // Retrieve states
  const retrievedStates = await server.getProfilingStates(applicationId)
  assert.strictEqual(retrievedStates.length, 2)
  assert.strictEqual(retrievedStates[0].isProfiling, true)
  assert.strictEqual(retrievedStates[0].isPaused, false)
  assert.strictEqual(retrievedStates[0].podId, podId)
})

test('getProfilingStates retrieves states from multiple pods', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId1 = 'test-pod-multi-1'
  const podId2 = 'test-pod-multi-2'
  const podId3 = 'test-pod-multi-3'
  const expiresIn = 20000

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Save states for multiple pods
  await server.saveProfilingStates(applicationId, podId1, expiresIn, [
    { isProfiling: true, isPaused: false, profileType: 'cpu' }
  ])

  await server.saveProfilingStates(applicationId, podId2, expiresIn, [
    { isProfiling: true, isPaused: false, profileType: 'heap' }
  ])

  await server.saveProfilingStates(applicationId, podId3, expiresIn, [
    { isProfiling: false, isPaused: true }
  ])

  const retrievedStates = await server.getProfilingStates(applicationId)

  assert.strictEqual(retrievedStates.length, 3)

  // Verify all pods are represented
  const podIds = retrievedStates.map(s => s.podId).sort()
  assert.deepStrictEqual(podIds, [podId1, podId2, podId3].sort())

  // Verify each state is correct
  const pod1State = retrievedStates.find(s => s.podId === podId1)
  assert.strictEqual(pod1State.isProfiling, true)
  assert.strictEqual(pod1State.isPaused, false)
  assert.strictEqual(pod1State.profileType, 'cpu')

  const pod2State = retrievedStates.find(s => s.podId === podId2)
  assert.strictEqual(pod2State.isProfiling, true)
  assert.strictEqual(pod2State.isPaused, false)
  assert.strictEqual(pod2State.profileType, 'heap')

  const pod3State = retrievedStates.find(s => s.podId === podId3)
  assert.strictEqual(pod3State.isProfiling, false)
  assert.strictEqual(pod3State.isPaused, true)
})

test('typical profiling state: isProfiling true, isPaused false', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId = 'test-pod-typical'
  const expiresIn = 10000

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Typical state during active profiling
  const typicalStates = [
    { isProfiling: true, isPaused: false, profileType: 'cpu', duration: 5000 },
    { isProfiling: true, isPaused: false, profileType: 'heap', duration: 3000 }
  ]

  await server.saveProfilingStates(applicationId, podId, expiresIn, typicalStates)

  const retrievedStates = await server.getProfilingStates(applicationId)

  assert.strictEqual(retrievedStates.length, 2)

  for (const state of retrievedStates) {
    assert.strictEqual(state.isProfiling, true, 'Typical state should have isProfiling true')
    assert.strictEqual(state.isPaused, false, 'Typical state should have isPaused false')
    assert.strictEqual(state.podId, podId)
    assert.ok(state.duration > 0)
  }
})
