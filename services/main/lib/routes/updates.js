'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/updates', {
    schema: {
      body: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          topic: { type: 'string' },
          type: { type: 'string' },
          data: { type: 'object' }
        }
      }
    },
    handler: async (request, reply) => {
      const { namespace, ...message } = request.body
      fastify.emitUpdate(message, { namespace })
      return reply.code(204).send()
    }
  })
}
