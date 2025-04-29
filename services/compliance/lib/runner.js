/// <reference path="../global.d.ts" />
'use strict'
const { join } = require('node:path')
/** @param {import('fastify').FastifyInstance} app */
module.exports.complianceRunner = async function complianceRunner (applicationId, app) {
  const { db, sql } = app.platformatic
  const where = []
  where.push(sql`rc.application_id IS NULL`)
  if (applicationId) {
    where.push(sql`rc.application_id = ${applicationId}`)
  }
  const whereClause = where.length > 0 ? sql.join(where, ' OR ') : sql`TRUE`
  const rows = await db.query(sql`
    SELECT
      r.id AS "id",
      r.name AS "name",
      r.label AS "label",
      r.description AS "description",
      rc.options AS "options",
      rc.type AS "type",
      rc.application_id AS "applicationId"
    FROM rule_configs rc
    JOIN rules r ON rc.rule_id = r.id
    WHERE rc.enabled = true
    AND ${whereClause}
    ORDER BY rc.type ASC
  `)

  const rulesToRun = {}
  rows.forEach((r) => {
    rulesToRun[r.name] = r
  })
  const rulesToRunArray = Object.values(rulesToRun)
  const promises = rulesToRunArray.map(async (r) => {
    // get Metadata
    const metadata = await app.platformatic.entities.metadatum.find({
      where: {
        applicationId: { eq: applicationId }
      },
      orderBy: [
        { field: 'createdAt', direction: 'desc' }
      ],
      limit: 1
    })
    const appData = metadata[0].data
    const rulesPath = join(__dirname, '..', app.config.PLT_COMPLIANCE_RULES_DIR, 'index.js')
    const ruleDefinitions = await import(rulesPath)
    const ruleClass = ruleDefinitions.default[r.name]
    // eslint-disable-next-line new-cap
    const ruleInstance = new ruleClass()

    ruleInstance.setConfig(r.options)
    return ruleInstance.run(appData)
  })

  const checkResult = await Promise.all(promises)
  const reports = []
  const outcome = checkResult.reduce((acc, current, index) => {
    reports.push({
      ruleId: rulesToRunArray[index].id,
      ruleName: rulesToRunArray[index].name,
      result: current.compliant,
      details: current.details,
      type: rulesToRunArray[index].type
    })
    return acc && current.compliant
  }, true)

  return { compliant: outcome, reports }
}
