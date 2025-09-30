'use strict'
const fp = require('fastify-plugin')
module.exports = fp(async function (app, opts) {
  app.decorate('shouldRunCompliance', async (applicationId, deploymentId) => {
    const oldReport = await app.platformatic.entities.report.find({
      where: {
        applicationId: { eq: applicationId },
        deploymentId: { eq: deploymentId }
      }
    })

    if (oldReport.length > 0) {
      return oldReport[0]
    }
    return true
  })

  app.decorate('saveComplianceReport', async (
    applicationId,
    deploymentId,
    compliant,
    rulesReports
  ) => {
    const ruleSet = rulesReports.map((rr) => {
      return {
        id: rr.ruleId,
        name: rr.ruleName,
        type: rr.type,
        details: rr.details,
        result: rr.result
      }
    })
    const input = {
      applicationId,
      deploymentId,
      result: compliant,
      ruleSet: JSON.stringify(ruleSet)
    }

    const data = await app.platformatic.entities.report.save({
      input
    })
    return data
  })
})
