/// <reference path="../global.d.ts" />
'use strict'

const { complianceRunner } = require('../lib/runner')
/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/compliance', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId']
      }
    }
  }, async (req, res) => {
    const { applicationId } = req.body
    const shouldRunOrLastReport = await app.shouldRunCompliance(applicationId)
    if (shouldRunOrLastReport === true) {
      const { compliant, reports } = await complianceRunner(applicationId, app)
      const output = await app.saveComplianceReport(applicationId, compliant, reports)
      return { compliant, executed: true, report: output }
    } else {
      // shouldRunOrLastReport contains last report
      const report = shouldRunOrLastReport
      return { compliant: report.result, executed: false, report }
    }
  })
}
