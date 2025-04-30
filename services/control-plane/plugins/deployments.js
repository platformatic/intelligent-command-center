/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getDeploymentById', async (deploymentId, ctx) => {
    const deployments = await app.platformatic.entities.deployment.find({
      where: { id: { eq: deploymentId } },
      tx: ctx?.tx
    })
    return deployments.length === 1 ? deployments[0] : null
  })

  app.decorate('getGenerationDeployments', async (generationId, ctx) => {
    const { db, sql } = app.platformatic

    const deployments = await db.query(sql`
      SELECT
        d.id,
        d.application_id as "applicationId",
        d.application_state_id as "applicationStateId",
        d.image_id as "imageId",
        d.status,
        d.created_at as "createdAt"
      FROM deployments d
      JOIN generations_deployments gd ON d.id = gd.deployment_id
      WHERE gd.generation_id = ${generationId}
    `)

    return deployments
  })

  app.decorate('getDeploymentByImageId', async (
    generationId,
    applicationId,
    imageId,
    ctx
  ) => {
    const { db, sql } = app.platformatic

    const deployments = await db.query(sql`
      SELECT
        d.id,
        d.application_id as "applicationId",
        d.application_state_id as "applicationStateId",
        d.image_id as "imageId",
        d.status,
        d.created_at as "createdAt"
      FROM deployments d
      JOIN generations_deployments gd ON d.id = gd.deployment_id
      WHERE
        gd.generation_id = ${generationId} AND
        d.application_id = ${applicationId} AND
        d.image_id = ${imageId}
      ORDER BY d.created_at DESC
      LIMIT 1
    `)

    ctx.logger.debug({ deployments }, 'Got deployments by image id')

    return deployments.length === 1 ? deployments[0] : null
  })

  app.decorate('updateDeploymentStatus', async (deployment, ctx) => {
    if (deployment.status === 'started') return

    const deploymentId = deployment.id

    ctx.logger.info({ deploymentId }, 'Updating deployment status')

    const instances = await app.getDeploymentInstances(deploymentId, ctx)
    if (instances.length === 0) {
      ctx.logger.error({ deploymentId }, 'Deployment has no instances')
      throw new errors.DeploymentHasNoInstances(deployment.id)
    }

    let status = 'failed'
    for (const instance of instances) {
      const instanceStatus = instance.status

      if (instanceStatus === 'running') {
        status = 'started'
        break
      }
      if (instanceStatus === 'starting') {
        status = 'starting'
      }
    }

    const updatedDeployment = await app.platformatic.entities.deployment.save({
      input: { id: deployment.id, status },
      tx: ctx?.tx
    })
    ctx.logger.info(
      { deployment: updatedDeployment },
      'Saved deployment with a new status'
    )
  })
})
