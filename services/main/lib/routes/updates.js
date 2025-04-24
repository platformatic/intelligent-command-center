'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/updates/:namespace', {
    schema: {
      params: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            enum: ['icc', 'applications']
          }
        },
        required: ['namespace']
      },
      body: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          type: { type: 'string' },
          data: { type: 'object' }
        },
        required: ['topic']
      }
    },
    handler: async (request, reply) => {
      const namespace = request.params.namespace
      const message = request.body

      fastify.emitUpdate(message, { namespace })
      return reply.code(204).send()
    }
  })
}
