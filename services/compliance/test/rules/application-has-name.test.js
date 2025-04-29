'use strict'

const { test } = require('node:test')
const ApplicationHasName = require('../fixtures/rules/application-has-name')
const assert = require('node:assert')

test('should check application name without options', async (t) => {
  const rule = new ApplicationHasName()
  const applicationData = {
    applicationName: 'my-app'
  }
  const output = await rule.run(applicationData)
  assert.deepStrictEqual(output, {
    compliant: true,
    details: { name: 'my-app', minLength: 0, maxLength: null }
  })
})

test('should check application name with minLength', async (t) => {
  const rule = new ApplicationHasName()
  const applicationData = { applicationName: 'my-app' }
  {
    rule.setConfigValue('minLength', 9999)
    const output = await rule.run(applicationData)
    assert.deepStrictEqual(output, {
      compliant: false,
      details: { name: 'my-app', minLength: 9999, maxLength: null }
    })
  }

  {
    rule.setConfigValue('minLength', 2)
    const output = await rule.run(applicationData)
    assert.deepStrictEqual(output, {
      compliant: true,
      details: { name: 'my-app', minLength: 2, maxLength: null }
    })
  }
})

test('should check application name with maxLength', async (t) => {
  const rule = new ApplicationHasName()
  const applicationData = { applicationName: 'my-app' }
  {
    rule.setConfigValue('maxLength', 9999)
    const output = await rule.run(applicationData)
    assert.deepStrictEqual(output, {
      compliant: true,
      details: { name: 'my-app', minLength: 0, maxLength: 9999 }
    })
  }

  {
    rule.setConfigValue('maxLength', 2)
    const output = await rule.run(applicationData)
    assert.deepStrictEqual(output, {
      compliant: false,
      details: { name: 'my-app', minLength: 0, maxLength: 2 }
    })
  }
})

test('should check application name with both maxLength and minLength', async (t) => {
  const rule = new ApplicationHasName()
  rule.setConfigValue('minLength', 8)
  rule.setConfigValue('maxLength', 10)
  {
    const output = await rule.run({ applicationName: 'my-app' })
    assert.deepStrictEqual(output, {
      compliant: false,
      details: { name: 'my-app', minLength: 8, maxLength: 10 }
    })
  }

  {
    const output = await rule.run({ applicationName: 'good-app' })
    assert.deepStrictEqual(output, {
      compliant: true,
      details: { name: 'good-app', minLength: 8, maxLength: 10 }
    })
  }
})
