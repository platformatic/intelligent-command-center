/// <reference path="../global.d.ts" />
'use strict'

const { UnknownUserError } = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/login', async (req, res) => {
    const { email, username, externalId } = req.body
    // search for user
    const found = await fastify.platformatic.entities.user.find({
      where: {
        email: {
          eq: email
        }
      }
    })

    if (found.length > 0) {
      const loggedInUser = found[0]
      if (loggedInUser.joined === false) {
        // update the user with the data
        const updatedUser = await fastify.platformatic.entities.user.save({
          fields: ['id', 'username', 'email', 'externalId'],
          input: {
            id: loggedInUser.id,
            username,
            externalId,
            joined: true
          }
        })
        req.session.set('user', updatedUser)
        return updatedUser
      } else {
        // the user already joined, we can return it
        req.session.set('user', loggedInUser)
        return loggedInUser
      }
    }
    throw new UnknownUserError(email)
  })
}
