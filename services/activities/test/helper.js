'use strict'

const { join } = require('node:path')
const { buildServer } = require('@platformatic/db')

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    PLT_ACTIVITIES_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/activities'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function startActivities (t, envOverride, activities = []) {
  setUpEnvironment(envOverride)

  const app = await buildServer({
    server: {
      hostname: '127.0.0.1',
      port: 3123,
      logger: { level: 'silent' }
    },
    db: {
      connectionString: process.env.PLT_ACTIVITIES_DATABASE_URL,
      graphql: {
        graphiql: true
      },
      events: false
    },
    migrations: {
      dir: join(__dirname, '..', 'migrations'),
      autoApply: true
    },
    plugins: {
      paths: [{
        path: join(__dirname, '..', 'routes')
      }]
    }
  })

  t && t.after(async () => {
    await app.close()
  })

  const { db, sql } = app.platformatic

  await app.start()

  await db.query(sql`DELETE FROM "activities"`)
  if (activities.length > 0) {
    await app.platformatic.entities.activity.insert({
      inputs: activities,
      skipAuth: true
    })
  }
  return app
}

module.exports = {
  startActivities,
  setUpEnvironment
}
