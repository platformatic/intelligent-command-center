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
          type: { type: 'string' },
          data: {
            type: 'object'
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { topic, type, data } = request.body
      fastify.mq.emit({
        topic,
        type,
        data
      })
      return reply.code(204).send()
    }
  })
}
