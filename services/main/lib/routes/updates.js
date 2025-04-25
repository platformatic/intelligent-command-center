'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/updates/icc', {
    schema: {
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
      const message = request.body
      fastify.emitUpdate(message, { namespace: 'icc' })
      return reply.code(204).send()
    }
  })

  fastify.post('/updates/applications/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
      const applicationId = request.params.id
      const namespace = `applications/${applicationId}`
      const message = request.body

      fastify.emitUpdate(message, { namespace })
      return reply.code(204).send()
    }
  })
}
