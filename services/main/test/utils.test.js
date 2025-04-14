'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getICCServices } = require('../lib/utils')

test('should list all ICC services name', async (t) => {
  const svcs = await getICCServices()

  assert.deepEqual(svcs, [
    // 'activities',
    'control-plane',
    // 'frontend',
    'main'
    // 'metrics',
    // 'user-manager'
  ])
})

test('should list all ICC services name excluding \'main\'', async (t) => {
  const svcs = await getICCServices(true)

  assert.deepEqual(svcs, [
    // 'activities',
    'control-plane'
    // 'frontend',
    // 'metrics',
    // 'user-manager'
  ])
})
