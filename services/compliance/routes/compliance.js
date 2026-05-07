/// <reference path="../global.d.ts" />
'use strict'

const { complianceRunner } = require('../lib/runner')
const errors = require('../lib/errors')

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
    const machineCtx = req.context
    if (!machineCtx) {
      throw new errors.MissingMachineAuthContext()
    }

    const machineId = machineCtx.machineId
    if (!machineId) {
      throw new errors.MachineIdNotFound()
    }

    const namespace = machineCtx.namespace
    if (!namespace) {
      throw new errors.MachineNamespaceNotFound()
    }

    const { applicationId } = req.body

    const instances = await req.controlPlane.getInstances({
      'where.machineId.eq': machineId,
      'where.namespace.eq': namespace,
      'where.applicationId.eq': applicationId
    })

    if (instances.length === 0) {
      throw new errors.InstanceNotFound(machineId)
    }

    const { deploymentId } = instances[0]

    const shouldRunOrLastReport = await app.shouldRunCompliance(
      applicationId,
      deploymentId
    )

    if (shouldRunOrLastReport === true) {
      const { compliant, reports } = await complianceRunner(applicationId, app)
      const output = await app.saveComplianceReport(
        applicationId,
        deploymentId,
        compliant,
        reports
      )
      return { compliant, executed: true, report: output }
    } else {
      // shouldRunOrLastReport contains last report
      const report = shouldRunOrLastReport
      return { compliant: report.result, executed: false, report }
    }
  })
}
