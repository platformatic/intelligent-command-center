'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const errors = require('./errors')

const plugin = fp(async function (app) {
  // Creates the default compliance rules for the newly created application
  app.decorate('createComplianceRule', async (applicationId, ctx) => {
    const ruleName = 'outdated-npm-deps'
    const url = `${app.env.PLT_COMPLIANCE_URL}/rules/${ruleName}`

    const { statusCode, body } = await request(url, {
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

    if (statusCode !== 200) {
      const error = await body.json()
      ctx.logger.error({ statusCode, error }, 'Cannot create compliance rule')
      throw new errors.CannotCreateComplianceRule(
        error.message || error.error || 'Unknown error'
      )
    }
  })
}, {
  name: 'compliance',
  dependencies: ['env']
})

module.exports = plugin
