'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startCompliance } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should get set of rules', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [
    {
      // a glboal config with no options
      name: 'application-has-name',
      enabled: true
    },
    {
      // a local config
      name: 'application-has-name',
      enabled: true,
      options: {
        applicationId,
        minLength: 100,
        maxLength: 9999
      }
    }
  ])
  const res = await server.inject({
    method: 'GET',
    url: '/rules'
  })

  const json = await res.json()
  assert.equal(res.statusCode, 200)
  assert.equal(json.length, 1)
  assert.deepEqual(json[0].config, {
    minLength: {
      type: 'number',
      description: 'Min length of application name',
      default: 0
    },
    maxLength: {
      type: 'number',
      description: 'Max length of application name',
      default: Number.MAX_VALUE
    }
  })
  assert.equal(json[0].configs.length, 2)
  const globalRuleConfig = json[0].configs[0]
  const localRuleConfig = json[0].configs[1]
  assert.deepEqual(globalRuleConfig.type, 'global')
  assert.deepEqual(globalRuleConfig.options, {})
  assert.deepEqual(localRuleConfig.options, {
    minLength: 100,
    maxLength: 9999
  })

  assert.equal(localRuleConfig.type, 'local')
  assert.equal(localRuleConfig.applicationId, applicationId)
})

test('should store global rule config', async (t) => {
  const server = await startCompliance(t)
  const res = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/rules/application-has-name',
    body: JSON.stringify({
      options: {
        minLength: 4,
        maxLength: 100
      }
    })
  })

  const output = await res.json()
  assert.equal(res.statusCode, 200)

  assert.ok(output.id)
  assert.equal(output.description, 'Checks the application has a name.')
  assert.equal(output.name, 'application-has-name')
  assert.equal(output.configs.length, 1)
  assert.deepEqual(output.options, {
    minLength: {
      type: 'number',
      description: 'Min length of application name',
      default: 0
    },
    maxLength: {
      type: 'number',
      description: 'Max length of application name',
      default: Number.MAX_VALUE
    }
  })
  const ruleConfig = output.configs[0]
  assert.ok(ruleConfig.id)
  assert.equal(ruleConfig.type, 'global')
  assert.deepEqual(ruleConfig.options, {
    minLength: 4,
    maxLength: 100
  })
})

test('should store local rule config', async (t) => {
  const server = await startCompliance(t)
  const applicationId = randomUUID()
  // first we save the global rule config
  await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/rules/application-has-name',
    body: JSON.stringify({
      options: {
        minLength: 4,
        maxLength: 100
      }
    })
  })

  // then we save a local rule config
  const res = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/rules/application-has-name',
    body: JSON.stringify({
      applicationId,
      options: {
        minLength: 40,
        maxLength: 1000
      }
    })
  })
  const output = await res.json()
  assert.equal(res.statusCode, 200)
  assert.ok(output.id)
  assert.equal(output.description, 'Checks the application has a name.')
  assert.equal(output.name, 'application-has-name')
  assert.equal(output.configs.length, 2)
  assert.deepEqual(output.options, {
    minLength: {
      type: 'number',
      description: 'Min length of application name',
      default: 0
    },
    maxLength: {
      type: 'number',
      description: 'Max length of application name',
      default: Number.MAX_VALUE
    }
  })
  const globalRuleConfig = output.configs[0]
  assert.ok(globalRuleConfig.id)
  assert.equal(globalRuleConfig.type, 'global')
  assert.equal(globalRuleConfig.applicationId, null)
  assert.deepEqual(globalRuleConfig.options, {
    minLength: 4,
    maxLength: 100
  })
  const localRuleConfig = output.configs[1]
  assert.ok(localRuleConfig.id)
  assert.equal(localRuleConfig.type, 'local')
  assert.equal(localRuleConfig.applicationId, applicationId)
  assert.deepEqual(localRuleConfig.options, {
    minLength: 40,
    maxLength: 1000
  })
})

test('should return error if the rule name is not recognized', async (t) => {
  const server = await startCompliance(t)
  // first we save the global rule config
  const res = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/rules/this-rule-is-not-valid',
    body: JSON.stringify({})
  })

  const output = await res.json()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(output, {
    code: 'PLT_COMPLIANCE_UNKNOWN_RULE',
    error: 'Internal Server Error',
    message: 'Unknown rule "this-rule-is-not-valid".',
    statusCode: 500
  })
})

test('should enable/disable global rule', async (t) => {
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      options: {
        maxLength: 10,
        minLength: 0
      }
    }
  ])

  {
    // disable rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        enabled: false
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    const ruleConfig = json.configs[0]
    assert.equal(ruleConfig.type, 'global')
    assert.equal(ruleConfig.enabled, false)
    assert.deepEqual(ruleConfig.options, {
      minLength: 0,
      maxLength: 10
    })
  }

  {
    // Enable rule again
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        enabled: true
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    const ruleConfig = json.configs[0]
    assert.equal(ruleConfig.type, 'global')
    assert.equal(ruleConfig.enabled, true)
    assert.deepEqual(ruleConfig.options, {
      minLength: 0,
      maxLength: 10
    })
  }
})

test('should enable/disable local rule', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      options: {
        applicationId,
        maxLength: 10,
        minLength: 0
      }
    }
  ])

  {
    // disable rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        applicationId,
        enabled: false
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    const ruleConfig = json.configs[0]
    assert.equal(ruleConfig.type, 'local')
    assert.equal(ruleConfig.applicationId, applicationId)
    assert.equal(ruleConfig.enabled, false)
    assert.deepEqual(ruleConfig.options, {
      minLength: 0,
      maxLength: 10
    })
  }

  {
    // Enable rule again
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        applicationId,
        enabled: true
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    const ruleConfig = json.configs[0]
    assert.equal(ruleConfig.type, 'local')
    assert.equal(ruleConfig.applicationId, applicationId)
    assert.deepEqual(ruleConfig.options, {
      minLength: 0,
      maxLength: 10
    })
  }
})

test('do not mixup global/local rule configs', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      options: {
        applicationId,
        maxLength: 10,
        minLength: 0
      }
    }
  ])

  // store global config
  await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/rules/application-has-name',
    body: JSON.stringify({
      options: {
        maxLength: 100,
        minLength: 10
      }
    })
  })

  {
    // ensure we have both configs
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        options: {
          maxLength: 100,
          minLength: 10
        }
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    assert.equal(json.configs.length, 2)

    // both configs are enabled
    assert.equal(json.configs[0].type, 'local')
    assert.equal(json.configs[0].enabled, true)
    assert.equal(json.configs[1].type, 'global')
    assert.equal(json.configs[1].enabled, true)
  }

  {
    // disable local rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        applicationId,
        enabled: false
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    assert.equal(json.configs[0].type, 'local')
    assert.equal(json.configs[0].enabled, false)
    assert.equal(json.configs[1].type, 'global')
    assert.equal(json.configs[1].enabled, true)
  }

  {
    // disable global rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        enabled: false
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)

    assert.equal(json.configs[0].type, 'local')
    assert.equal(json.configs[0].enabled, false)
    assert.equal(json.configs[1].type, 'global')
    assert.equal(json.configs[1].enabled, false)
  }

  {
    // re-enable global rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        enabled: true
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    assert.equal(json.configs[0].type, 'local')
    assert.equal(json.configs[0].enabled, false)
    assert.equal(json.configs[1].type, 'global')
    assert.equal(json.configs[1].enabled, true)
  }

  {
    // re-enable local rule
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      url: '/rules/application-has-name',
      body: JSON.stringify({
        applicationId,
        enabled: true
      })
    })

    const json = await res.json()
    assert.equal(res.statusCode, 200)
    assert.equal(json.configs[0].type, 'local')
    assert.equal(json.configs[0].enabled, true)
    assert.equal(json.configs[1].type, 'global')
    assert.equal(json.configs[1].enabled, true)
  }
})
