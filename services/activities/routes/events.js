/// <reference path="../global.d.ts" />
'use strict'

const { MissingTargetError, MissingObjectTypeError } = require('../lib/errors')
const { getPayloadForEventType } = require('../events')
/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/events', {
    schema: {
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          userId: { type: 'string' },
          username: { type: 'string' },
          targetId: { type: 'string' },
          applicationId: { type: 'string' },
          success: { type: 'boolean' },
          data: {
            type: 'object'
          }
        }
      }
    }
  }, async (req, reply) => {
    const body = req.body
    const eventType = body.type
    if (!body.applicationId && !body.targetId) {
      throw new MissingTargetError()
    }
    const payload = getPayloadForEventType(eventType, body)
    if (payload.objectId && !payload.objectType) {
      throw new MissingObjectTypeError()
    }

    const res = await app.platformatic.entities.activity.save({ input: payload })

    return res
  })

  app.get('/events', async (req, reply) => {
    const {
      limit = 10,
      offset = 0,
      search,
      userId,
      applicationId
    } = req.query

    // This APi is a searcheable / paged / ordered list of events.
    // we cannot use the uqery created by platforamtic DB directly because
    // we need to have "serach" on user and event fields too.
    const { db, sql } = app.platformatic

    let query = sql`SELECT 
      id,
      user_id as "userId",
      username,
      event,
      object_id as "objectId",
      data,
      description,
      success,
      created_at as "createdAt",
      application_id as "applicationId"
    FROM activities`
    let queryCount = sql`SELECT COUNT(*) FROM activities`

    const wheres = []

    if (userId) {
      wheres.push(sql`user_id = ${userId}`)
    }

    if (applicationId) {
      wheres.push(sql`application_id = ${applicationId}`)
    }

    if (search) {
      wheres.push(sql`(to_tsvector(event) || to_tsvector(username)) @@ plainto_tsquery(${search})`)
    }

    if (wheres.length > 0) {
      query = sql`${query} WHERE ${sql.join(wheres, sql` AND `)}`
      queryCount = sql`${queryCount} WHERE ${sql.join(wheres, sql` AND `)}`
    }

    // Order by
    const orderByKeys = Object.keys(req.query).filter((key) => key.startsWith('orderby.'))
    const orderBy = []
    for (const key of orderByKeys) {
      const [, field] = key.split('.')
      orderBy.push({ field, direction: req.query[key] })
    }
    const fields = app.platformatic.entities.activity.fields
    const fieldKeys = Object.keys(fields)

    // We don't have this map saved on entities.
    const fieldsMap = fieldKeys.reduce((acc, key) => {
      const field = fields[key]
      acc[field.camelcase] = key
      return acc
    }, {})
    if (orderBy && orderBy.length > 0) {
      const orderBySQL = orderBy.map((order) => {
        const field = fieldsMap[order.field] || order.field
        return sql`${sql.ident(field)} ${sql.__dangerous__rawValue(order.direction)}`
      })
      query = sql`${query} ORDER BY ${sql.join(orderBySQL, sql`, `)}`
    } else {
      query = sql`${query} ORDER BY created_at DESC`
    }

    if (limit !== undefined) {
      query = sql`${query} LIMIT ${limit}`
    }

    if (offset !== undefined) {
      query = sql`${query} OFFSET ${offset}`
    }

    const events = await db.query(query)
    const count = await db.query(queryCount)
    reply.header('X-Total-Count', count[0].count)
    return events
  })
}
