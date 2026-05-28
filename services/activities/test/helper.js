'use strict'

const { join } = require('node:path')
const platformaticDb = require('@platformatic/db')

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    PLT_ACTIVITIES_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/activities'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function startActivities (t, envOverride, activities = []) {
  setUpEnvironment(envOverride)

  const capability = await platformaticDb.create(join(__dirname, '..'), {
    server: {
      hostname: '127.0.0.1',
      port: 0,
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
  await capability.init()
  const app = capability.getApplication()

  t && t.after(async () => {
    await capability.stop()
  })

  const { db, sql } = app.platformatic

  await capability.start()

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
