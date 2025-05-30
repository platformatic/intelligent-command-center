'use strict'

module.exports = async function (app) {
  app.get('/paths/window', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: {
            type: 'integer'
          }
        }
      }
    },
    handler: async (req) => {
      const { days = 30 } = req.query
      const { sql, db } = app.platformatic
      const paths = await db.query(sql`SELECT path, SUM(counter) AS counter 
      FROM paths 
      WHERE dumped_at > (NOW() - ${days} * '1 day'::INTERVAL)
      GROUP BY path ORDER BY counter DESC`)
      const result = paths.reduce((acc, path) => {
        acc[path.path] = path.counter
        return acc
      }, {})
      return result
    }
  })

  app.post('/paths/dump', {
    schema: {
      body: {
        type: 'object',
        properties: {
          dump: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                counter: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const payload = req.body
      const { path } = app.platformatic.entities
      const dump = payload?.dump || []
      if (dump.length !== 0) {
        await path.insert({ inputs: dump })
      }
      return { ok: true }
    }
  })
}
