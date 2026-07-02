'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

test('getScalingLimits returns hard when no soft limits', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 2, maxPods: 8 } })

  const limits = await server.getScalingLimits(appId)
  assert.deepEqual(limits, { minPods: 2, maxPods: 8 })
})

test('getScalingLimits clamps soft within hard', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 2, maxPods: 8 } })
  // soft asks for 5..20 → max clamped to hard 8; min stays 5
  await server.store.saveSoftLimits(appId, { min: 5, max: 20 }, 120)

  const limits = await server.getScalingLimits(appId)
  assert.deepEqual(limits, { minPods: 5, maxPods: 8 })
})

test('getScalingLimits with partial soft (only min)', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 1, maxPods: 10 } })
  await server.store.saveSoftLimits(appId, { min: 4, max: null }, 120)

  const limits = await server.getScalingLimits(appId)
  assert.deepEqual(limits, { minPods: 4, maxPods: 10 })
})

test('getScalingLimits collapses min>max to max', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 1, maxPods: 3 } })
  await server.store.saveSoftLimits(appId, { min: 9, max: null }, 120) // soft min 9 > hard max 3
  const limits = await server.getScalingLimits(appId)
  assert.deepEqual(limits, { minPods: 3, maxPods: 3 })
})

test('getScalingLimits returns null when no hard config and no soft', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  assert.equal(await server.getScalingLimits(randomUUID()), null)
})
