/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.platformatic.addEntityHooks('user', {
    save: async (save, opts) => {
      if (opts.input.id) {
        // update user
        const found = await fastify.platformatic.entities.user.find({
          where: { id: { eq: opts.input.id } }
        })
        const theUser = found[0]

        if (theUser.joined === false) {
          if (opts.input.joined === true) {
            // this is the first login of the user
            const saved = await save({
              input: {
                id: theUser.id,
                joined: true,
                externalId: opts.input.externalId,
                username: opts.input.username
              }
            })
            return saved
          } else {
            if (opts.input.role) {
              // this is an admin that can update just the role
              const saved = await save({
                input: {
                  id: theUser.id,
                  role: opts.input.role
                }
              })
              return saved
            } else {
              // there are no more fields to be updated, we return the original user
              return theUser
            }
          }
        } else {
          // this is the admin updating an user role
          if (opts.input.role) {
            // this is an admin that can update just the role
            const saved = await save({
              input: {
                id: theUser.id,
                role: opts.input.role
              }

            })
            return saved
          } else {
            // there are no more fields to be updated, we return the original user
            return theUser
          }
        }
      } else {
        // create new user
        const newUser = await save({
          input: {
            joined: false,
            email: opts.input.email,
            username: opts.input.username,
            externalId: opts.input.externalId,
            role: 'user'
          }
        })

        return newUser
      }
    }
  })

  fastify.get('/me', async (req, reply) => {
    const user = req.session.get('user')
    if (!user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized'
      })
    }
    return user
  })
}
