'use strict'

const fp = require('fastify-plugin')

// logical delete plugin
const createEntityHook = (app) => (entityName) => {
  app.platformatic.addEntityHooks(entityName, {
    async find (original, args = {}) {
      const { where, rest } = args
      const res = await original({
        where: {
          ...where,
          deletedAt: { eq: null }
        },
        ...rest
      })
      return res
    },

    async delete (_original, { where, ...rest }) {
      const { tx } = rest
      if (where?.id) {
        const id = where.id?.eq
        const entity = (await app.platformatic.entities[entityName].find({
          where: {
            id: {
              eq: id
            }
          },
          tx
        }))?.[0]

        // This to avoid deleting protected ICC internal jobs.
        // We could also use pb authorizations, but being this a "logical" delete (so
        // actually an update), it would be much more convoluted
        if (entity.protected) {
          throw new Error('Cannot delete protected entity')
        }

        const input = {
          ...entity,
          deletedAt: new Date()
        }

        return app.platformatic.entities[entityName].save({ input, tx })
      }
      await app.platformatic.entities[entityName].updateMany({
        where,
        input: {
          deletedAt: new Date()
        },
        tx
      })
    }
  })
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const entities = Object.keys(app.platformatic.entities)
  entities.forEach(createEntityHook(app))
})
