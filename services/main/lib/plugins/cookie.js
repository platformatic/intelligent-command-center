'use strict'
/// <reference path="../global.d.ts" />

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
async function cookiePlugin (app, opts) {
  app.register(require('@fastify/cookie'))
}

module.exports = fp(cookiePlugin, { name: 'cookie' })
