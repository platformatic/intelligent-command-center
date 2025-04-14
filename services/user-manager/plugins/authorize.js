'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

async function plugin (app, opts) {
  app.post('/authorize', {
    logLevel: 'warn',
    schema: {
      body: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          path: { type: 'string' }
        },
        required: ['method', 'path']
      }
    }
  }, async (req, reply) => {
    const user = req.session.get('user')
    if (!user) {
      throw new errors.MissingCredentialsError()
    }

    const { method } = req.body
    if (user.role === 'admin' || user.role === 'super-admin') {
      return { authorized: true, user }
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return { authorized: false, user }
    }
    return { authorized: true, user }
  })
}

module.exports = fp(plugin)
