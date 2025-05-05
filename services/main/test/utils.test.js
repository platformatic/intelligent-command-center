'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getICCServices } = require('../lib/utils')

test('should list all ICC services name', async (t) => {
  const svcs = await getICCServices()

  assert.deepEqual(svcs, [
    'activities',
    'cache-manager',
    'compliance',
    'control-plane',
    'cron',
    'frontend',
    'main',
    'metrics',
    'scaler',
    'user-manager'
  ])
})

test('should list all ICC services name excluding \'main\'', async (t) => {
  const svcs = await getICCServices(true)

  assert.deepEqual(svcs, [
    'activities',
    'cache-manager',
    'compliance',
    'control-plane',
    'cron',
    'frontend',
    'metrics',
    'scaler',
    'user-manager'
  ])
})
