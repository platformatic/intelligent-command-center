/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const { randomUUID } = require('node:crypto')
const { RecommendationCalculating, RecommendationNotFound } = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  function addMetadataToSteps (steps) {
    return steps?.map((s) => {
      return {
        ...s,
        status: null,
        id: randomUUID()
      }
    })
  }

  app.decorate('startRecommendation', async (ctx) => {
    const recommendationEntity = app.platformatic.entities.recommendation
    const calculatingRecommendationCount = await recommendationEntity.count({
      where: { status: { eq: 'calculating' } }
    })
    if (calculatingRecommendationCount > 0) {
      throw new RecommendationCalculating()
    }

    const input = { status: 'calculating' }
    const result = await recommendationEntity.insert({
      inputs: [input]
    })
    return result[0]
  })

  app.decorate('storeRecommendation', async (recommendation, recommendationData, ctx) => {
    const data = {
      apps: recommendationData.apps,
      steps: addMetadataToSteps(recommendationData.steps)
    }

    const recommendationEntity = app.platformatic.entities.recommendation
    // check other recommendation
    const previousRecommendation = await recommendationEntity.find({
      where: { status: { eq: 'new' } }
    })
    for (const opt of previousRecommendation) {
      // update their status to 'expired'
      await recommendationEntity.save({
        input: {
          ...opt,
          status: 'expired'
        }
      })
    }

    // Can't use save() as it doesn't support the JSON data object, apparently!
    const result = await recommendationEntity.updateMany({
      where: {
        id: { eq: recommendation.id }
      },
      input: {
        ...recommendation,
        data,
        status: 'new'
      }
    })

    return result[0]
  })

  app.decorate('getRecommendationById', async (id) => {
    const res = await app.platformatic.entities.recommendation.find({
      where: { id: { eq: id } }
    })
    if (res.length === 1) {
      return res[0]
    }
    throw new RecommendationNotFound(id)
  })
})
