/// <reference path="../global.d.ts" />
'use strict'

const { getTypes } = require('../events')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/types', async (req, res) => {
    const types = getTypes()
    return types
  })
}
