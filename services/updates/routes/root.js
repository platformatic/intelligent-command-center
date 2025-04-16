/// <reference path="../global.d.ts" />
'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/events', {
    schema: {
      body: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          data: {
            type: 'object'
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { topic, data } = request.body
      fastify.mq.emit({
        topic,
        data
      })
      return reply.code(204).send()
    }
  })
}
