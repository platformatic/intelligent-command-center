/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.get('/updates', {
    handler: async (req) => {
      const newRecommendations = await app.platformatic.entities.recommendation.find({
        where: { status: { eq: 'new' } },
        limit: 1
      })

      if (newRecommendations.length === 0) {
        // Kick-off async optimization
        await app.optimizeAndRecommend({}, { req })
        return { serviceName: 'cluster-manager', updates: [] }
      }
      return {
        serviceName: 'cluster-manager',
        updates: [{
          type: 'new-recommendation',
          count: newRecommendations[0].count
        }]
      }
    }
  })
}
