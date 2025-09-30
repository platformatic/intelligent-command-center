'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startActivities } = require('../helper')

test('should get activities\' types', async (t) => {
  const server = await startActivities(t, {})

  const res = await server.inject({
    method: 'GET',
    url: '/types'
  })

  assert.strictEqual(res.statusCode, 200)
  assert.deepEqual(res.json(), {
    USER_LOGIN: 'User Login',
    APPLICATION_CREATE: 'Application Create',
    APPLICATION_DEPLOY: 'Application Deploy',
    APPLICATION_RESOURCES_UPDATE: 'Application Resources Update',
    SCALED_UP: 'Application Scaled Up',
    SCALED_DOWN: 'Application Scaled Down',
    CONFIG_UPDATE: 'Application Configuration Update'
  })
})
