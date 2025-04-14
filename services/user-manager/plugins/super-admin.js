/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  const superAdminEmails = fastify.config.PLT_USER_MANAGER_SUPER_ADMIN_EMAIL?.split(',')
  if (superAdminEmails) {
    for (let i = 0; i < superAdminEmails.length; i++) {
      // find the superadmin
      const emailToCheck = superAdminEmails[i].trim()
      const superAdminUser = await fastify.platformatic.entities.user.find({
        where: { email: { eq: emailToCheck } }
      })
      if (superAdminUser.length === 0) {
        await fastify.platformatic.entities.user.save({
          fields: ['id', 'email'],
          input: {
            email: emailToCheck,
            role: 'super-admin'
          }
        })
      }
    }
  }
}
