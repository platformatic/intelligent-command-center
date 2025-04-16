/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('sendSuccessfulApplicationCreateActivity', async (
    applicationId,
    applicationName,
    ctx
  ) => {
    await sendSuccessActivity({
      type: 'APPLICATION_CREATE',
      applicationId,
      data: { applicationName },
      targetId: applicationId
    }, ctx)
  })

  app.decorate('sendFailedApplicationCreateActivity', async (
    applicationId,
    applicationName,
    err,
    ctx
  ) => {
    await sendFailedActivity({
      type: 'APPLICATION_CREATE',
      applicationId,
      data: { applicationName },
      targetId: applicationId
    }, err, ctx)
  })

  app.decorate('sendSuccessfulApplicationDeployActivity', async (
    applicationId,
    applicationName,
    imageId,
    ctx
  ) => {
    await sendSuccessActivity({
      type: 'APPLICATION_DEPLOY',
      applicationId,
      data: { applicationName, imageId },
      targetId: applicationId
    }, ctx)
  })

  app.decorate('sendFailedApplicationDeployActivity', async (
    applicationId,
    applicationName,
    imageId,
    err,
    ctx
  ) => {
    await sendFailedActivity({
      type: 'APPLICATION_DEPLOY',
      applicationId,
      data: { applicationName, imageId },
      targetId: applicationId
    }, err, ctx)
  })

  app.decorate('sendSuccessfulResourceUpdateActivity', async (
    applicationId,
    applicationName,
    resources,
    ctx
  ) => {
    await sendSuccessActivity({
      type: 'APPLICATION_RESOURCES_UPDATE',
      applicationId,
      data: { applicationName, resources },
      targetId: applicationId
    }, ctx)
  })

  app.decorate('sendFailedResourceUpdateActivity', async (
    applicationId,
    applicationName,
    resources,
    err,
    ctx
  ) => {
    await sendFailedActivity({
      type: 'APPLICATION_RESOURCES_UPDATE',
      applicationId,
      data: { applicationName, resources },
      targetId: applicationId
    }, err, ctx)
  })

  function sendSuccessActivity (activity, ctx) {
    const userId = ctx.req.user?.id
    const username = ctx.req.user?.username

    if (userId !== undefined && username !== undefined) {
      activity.userId = userId
      activity.username = username
    }

    activity.success = true

    return sendActivity(activity, ctx)
  }

  function sendFailedActivity (activity, err, ctx) {
    if (
      activity.userId === undefined ||
      activity.username === undefined
    ) {
      activity.userId = ctx.req.user.id
      activity.username = ctx.req.user.username
    }

    activity.success = false
    activity.data = {
      error: {
        code: err.code,
        message: err.message
      },
      ...activity.data
    }

    return sendActivity(activity, ctx)
  }

  async function sendActivity (activity, ctx) {
    let result = await ctx.req.activities.postEvents(activity)

    if (typeof result === 'string') {
      result = JSON.parse(result)
    }

    if (result.id) {
      ctx.logger.info(
        { event: result },
        `Activity ${result.event} stored with id ${result.id}`
      )
    }
    if (result.error) {
      ctx.logger.error(
        { event: result },
        `Activity not stored with error "${result.message}"`
      )
    }
  }
})
