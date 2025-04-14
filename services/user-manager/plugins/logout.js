/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/logout', async (req, res) => {
    req.session.delete('user')
    return 200
  })
}
