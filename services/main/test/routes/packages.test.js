'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { MockAgent, setGlobalDispatcher } = require('undici')
const agent = new MockAgent()
const { getServer, authorizeEndpoint } = require('../helper')
setGlobalDispatcher(agent)

test('get package versions', async (t) => {
  const client = agent.get('https://registry.npmjs.org')
  client.intercept({
    method: 'GET',
    path: /.*/
  })
    .reply((req) => {
      let versionToReturn
      switch (req.path) {
        case '/@platformatic/runtime':
          versionToReturn = '1.1.1'
          break
        case '/@platformatic/db':
          versionToReturn = '2.2.2'
          break
        case '/@platformatic/composer':
          versionToReturn = '3.3.3'
          break
        case '/@platformatic/service':
          versionToReturn = '4.4.4'
          break
      }
      return {
        statusCode: 200,
        data: {
          'dist-tags': {
            latest: versionToReturn
          },
          versions: {
            [versionToReturn]: {}
          }
        }
      }
    }).persist()
  const app = await getServer(t)
  await app.start()

  authorizeEndpoint(agent, 'GET', '/api/package_versions')

  const res = await app.inject({
    method: 'GET',
    headers: {
      cookie: 'auth-cookie-name=fake-cookie'
    },
    url: '/api/package_versions'
  })

  const ret = res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.deepEqual(ret, {
    package_versions: {
      '@platformatic/runtime': { 1: '1.1.1' },
      '@platformatic/db': { 2: '2.2.2' },
      '@platformatic/composer': { 3: '3.3.3' },
      '@platformatic/service': { 4: '4.4.4' }
    }
  })
})

test('get package versions returns latest per major version', async (t) => {
  // Create a fresh MockAgent for this test
  const testAgent = new MockAgent()
  setGlobalDispatcher(testAgent)

  const client = testAgent.get('https://registry.npmjs.org')
  client.intercept({
    method: 'GET',
    path: /.*/
  })
    .reply((req) => {
      let versionsData
      switch (req.path) {
        case '/@platformatic/runtime':
          versionsData = {
            versions: {
              '1.0.0': {},
              '1.0.1': {},
              '1.52.0': {},
              '1.52.1': {},
              '1.52.2': {},
              '1.53.0': {},
              '2.0.0': {},
              '2.1.0': {},
              '2.75.0': {},
              '2.75.1': {},
              '2.75.2': {}
            },
            'dist-tags': {
              latest: '2.75.2'
            }
          }
          break
        case '/@platformatic/db':
          versionsData = {
            versions: {
              '1.0.0': {},
              '1.52.2': {},
              '2.0.0': {},
              '2.75.2': {}
            },
            'dist-tags': {
              latest: '2.75.2'
            }
          }
          break
        case '/@platformatic/composer':
          versionsData = {
            versions: {
              '1.0.0': {},
              '1.52.2': {},
              '2.0.0': {},
              '2.75.2': {}
            },
            'dist-tags': {
              latest: '2.75.2'
            }
          }
          break
        case '/@platformatic/service':
          versionsData = {
            versions: {
              '1.0.0': {},
              '1.52.2': {},
              '2.0.0': {},
              '2.75.2': {}
            },
            'dist-tags': {
              latest: '2.75.2'
            }
          }
          break
      }
      return {
        statusCode: 200,
        data: versionsData
      }
    }).persist()

  const app = await getServer(t)
  await app.start()

  // Mock authorization
  const { authorizeEndpoint } = require('../helper')
  authorizeEndpoint(testAgent, 'GET', '/api/package_versions')

  // Test - should return latest version for each major
  const res = await app.inject({
    method: 'GET',
    headers: {
      cookie: 'auth-cookie-name=fake-cookie'
    },
    url: '/api/package_versions'
  })

  const ret = res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.deepEqual(ret, {
    package_versions: {
      '@platformatic/runtime': {
        1: '1.53.0',
        2: '2.75.2'
      },
      '@platformatic/db': {
        1: '1.52.2',
        2: '2.75.2'
      },
      '@platformatic/composer': {
        1: '1.52.2',
        2: '2.75.2'
      },
      '@platformatic/service': {
        1: '1.52.2',
        2: '2.75.2'
      }
    }
  })
})
