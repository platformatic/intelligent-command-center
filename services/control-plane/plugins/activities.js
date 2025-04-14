/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('sendSuccessfulResourceUpdateActivity', async (
    applicationId,
    resources,
    ctx
  ) => {
    await sendSuccessActivity({
      type: 'APPLICATION_RESOURCES_UPDATE',
      applicationId,
      data: resources,
      targetId: applicationId
    }, ctx)
  })

  app.decorate('sendFailedResourceUpdateActivity', async (
    applicationId,
    resources,
    err,
    ctx
  ) => {
    await sendFailedActivity({
      type: 'APPLICATION_RESOURCES_UPDATE',
      applicationId,
      data: resources,
      targetId: applicationId
    }, err, ctx)
  })

  app.decorate('sendApplicationStartedActivity', async (
    applicationId,
    ctx
  ) => {
    await sendSuccessActivity({
      type: 'APPLICATION_START',
      userId: null,
      username: null,
      applicationId,
      targetId: applicationId
    }, ctx)
  })

  app.decorate('sendApplicationFailedActivity', async (
    applicationId,
    err,
    ctx
  ) => {
    await sendFailedActivity({
      type: 'APPLICATION_START',
      userId: null,
      username: null,
      applicationId,
      targetId: applicationId
    }, err, ctx)
  })

  function sendSuccessActivity (activity, ctx) {
    if (
      activity.userId === undefined ||
      activity.username === undefined
    ) {
      activity.userId = ctx.req.user.id
      activity.username = ctx.req.user.username
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
        `Activity ${result.event} by ${result.username} stored with id ${result.id}`
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
