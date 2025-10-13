'use strict'

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/pods/:podId/command', {
    schema: {
      params: {
        type: 'object',
        properties: {
          podId: { type: 'string' }
        },
        required: ['podId']
      },
      body: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            enum: ['trigger-flamegraph', 'trigger-heapprofile']
          },
          params: {
            type: 'object',
            additionalProperties: true
          }
        },
        required: ['command']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { podId } = request.params
      const { command, params } = request.body

      try {
        const result = await fastify.executePodCommand(podId, command, params)
        return {
          success: true,
          message: `Command '${command}' executed for pod ${podId}`,
          data: result
        }
      } catch (err) {
        fastify.log.error({ err, podId, command }, 'Failed to execute pod command')
        throw err
      }
    }
  })
}
