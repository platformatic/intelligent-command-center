'use strict'

module.exports = async function (app) {
  app.get('/latencies/window', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              count: { type: 'integer' },
              mean: { type: 'integer' }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { days = 30 } = req.query
      const { sql, db } = app.platformatic
      return db.query(sql`SELECT service_from as "from", service_to as "to", count, mean    
        FROM latencies
        WHERE dumped_at > (NOW() - ${days} * '1 day'::INTERVAL)
      `)
    }
  })

  app.post('/latencies/dump', {
    schema: {
      body: {
        type: 'object',
        properties: {
          dump: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                mean: { type: 'integer' },
                count: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const payload = req.body
      const { latency } = app.platformatic.entities
      const dump = payload?.dump || []

      // "from" and "to" are "reserved" keywords in SQL, so we need to rename them
      const inputs = dump.map(({ from, to, mean, count }) =>
        ({ serviceFrom: from, serviceTo: to, mean, count }))

      if (dump.length !== 0) {
        await latency.insert({ inputs })
      }
      return { ok: true }
    }
  })
}
