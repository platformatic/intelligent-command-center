/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.get('/updates', {
    handler: async (req) => {
      const newRecommendations = await app.platformatic.entities.recommendation.find({
        where: { status: { eq: 'new' } },
        limit: 1
      })
      if (newRecommendations.length === 0) {
        return {
          serviceName: 'traffic-inspector',
          updates: []
        }
      }
      return {
        serviceName: 'traffic-inspector',
        updates: [{
          type: 'new-recommendation',
          count: newRecommendations[0].version
        }]
      }
    }
  })
}
