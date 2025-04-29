'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const errors = require('./errors')
const plugin = fp(async function (app) {
  // Creates the default compliance rules for the newly created application
  app.decorate('createComplianceRule', async (applicationId, ctx) => {
    const ruleName = 'outdated-npm-deps'
    const res = await request(`${app.env.PLT_EXTERNAL_COMPLIANCE_URL}/rules/${ruleName}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        name: ruleName,
        description: 'Outdated NPM Dependencies',
        label: 'Outdated NPM Dependencies',
        applicationId,
        config: {}
      })
    })
    if (res.statusCode !== 200) {
      const json = await res.body.json()
      const errorMessage = json.message || json.error || 'Unknown error'
      throw new errors.CannotCreateComplianceRule(res.statusCode, errorMessage)
    }
  })
}, {
  name: 'compliance',
  dependencies: ['env']
})

module.exports = plugin
