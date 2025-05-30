'use strict'

module.exports = async function (app) {
  app.get('/db/window', {
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
              dbId: { type: 'string' },
              columns: { type: 'array', items: { type: 'string' } },
              targetTable: { type: 'string' }, // table name for INSERT/DELETE/UPDATES
              tables: { type: 'array', items: { type: 'string' } },
              queryType: { type: 'string' },
              dbName: { type: 'string' },
              host: { type: 'string' },
              port: { type: 'integer' },
              dbSystem: { type: 'string' },
              paths: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { days = 30 } = req.query
      const { sql, db } = app.platformatic
      const ops = await db.query(sql`
        SELECT * FROM db_operations 
        WHERE dumped_at > (NOW() - ${days} * '1 day'::INTERVAL)
      `)
      const ret = []
      for (const op of ops) {
        const {
          db_id: dbId,
          columns,
          target_table: targetTable,
          tables,
          query_type: queryType,
          db_name: dbName,
          host,
          port,
          db_system: dbSystem,
          paths
        } = op
        ret.push({ dbId, columns, targetTable, tables, queryType, dbName, host, port, dbSystem, paths })
      }
      return ret
    }
  })

  app.post('/db/dump', {
    schema: {
      body: {
        type: 'object',
        properties: {
          dump: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dbId: { type: 'string' },
                columns: { type: 'array', items: { type: 'string' } },
                targetTable: { type: 'string' }, // table name for INSERT/DELETE/UPDATES
                tables: { type: 'array', items: { type: 'string' } },
                queryType: { type: 'string' },
                dbName: { type: 'string' },
                host: { type: 'string' },
                port: { type: 'integer' },
                dbSystem: { type: 'string' },
                paths: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { sql, db } = app.platformatic
      const payload = req.body
      const dump = payload?.dump || []

      // If we receive the same db operations for the same paths, we don't save them again
      // So we use ON CONFLICT DO NOTHING

      if (dump.length !== 0) {
        const query = sql`
          INSERT INTO db_operations 
            (db_id, columns, target_table, tables, query_type, db_name,  host, port, db_system, paths) 
          VALUES 
            ${sql.join(dump.map(d =>
              sql`(${d.dbId}, ${d.columns}, ${d.targetTable}, ${d.tables}, ${d.queryType}, ${d.dbName}, ${d.host}, ${d.port}, ${d.dbSystem}, ${d.paths})`)
            , ',')}
          ON CONFLICT DO NOTHING
        `
        await db.query(query)
      }
      return { ok: true }
    }
  })
}
