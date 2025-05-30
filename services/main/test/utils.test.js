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
    'risk-cold-storage',
    'risk-service',
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
    'risk-cold-storage',
    'risk-service',
    'scaler',
    'user-manager'
  ])
})
