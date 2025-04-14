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
      '@platformatic/runtime': '1.1.1',
      '@platformatic/db': '2.2.2',
      '@platformatic/composer': '3.3.3',
      '@platformatic/service': '4.4.4'
    }
  })
})
