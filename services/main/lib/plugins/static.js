'use strict'

const fp = require('fastify-plugin')

async function plugin (fastify) {
  // We need this to avoid fastify to answer 404, because we want to use
  // a proper 404 page from dashformatic
  /* istanbul ignore next */
  fastify.setNotFoundHandler((request, reply) => {
    reply.redirect(`/#/notfound?path=${request.url}`)
  })
}

module.exports = fp(plugin, {
  name: 'static'
})
