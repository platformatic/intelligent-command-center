'use strict'

const { join } = require('node:path')
const { buildServer } = require('@platformatic/db')
const {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher
} = require('undici')
const allLocalRules = require('./fixtures/rules/index')

const mockAgent = new MockAgent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
})

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    PLT_COMPLIANCE_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/compliance',
    PLT_COMPLIANCE_RULES_DIR: 'test/fixtures/rules'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function startCompliance (t, envOverride, rulesData) {
  setUpEnvironment(envOverride)

  const app = await buildServer({
    server: {
      hostname: '127.0.0.1',
      port: 3003,
      logger: { level: 'silent' }
    },
    db: {
      connectionString: process.env.PLT_COMPLIANCE_DATABASE_URL,
      openapi: false,
      events: false
    },
    migrations: {
      dir: join(__dirname, '..', 'migrations'),
      autoApply: true
    },
    plugins: {
      paths: [
        { path: join(__dirname, '..', 'plugins') },
        { path: join(__dirname, '..', 'routes') }
      ]
    }
  })

  t.after(async () => {
    await app.close()
  })

  const { db, sql } = app.platformatic

  // save rules
  await app.start()

  await db.query(sql`DELETE FROM "reports"`)
  await db.query(sql`DELETE FROM "rule_configs"`)
  await db.query(sql`DELETE FROM "rules"`)
  await db.query(sql`DELETE FROM "metadata"`)
  if (rulesData) {
    for (let i = 0; i < rulesData.length; i++) {
      const rule = rulesData[i]

      if (rule.metadata) {
        // store metadata for compliance
        await app.platformatic.entities.metadatum.save({
          input: {
            applicationId: rule.metadata.applicationId,
            data: rule.metadata.data
          }
        })
      }
      let savedRule
      // first search for the rule if already present
      const foundRule = await app.platformatic.entities.rule.find({
        where: {
          name: {
            eq: rule.name
          }
        }
      })
      if (foundRule.length > 0) {
        savedRule = foundRule[0]
      } else {
        const input = {
          name: rule.name
        }
        if (allLocalRules[rule.name]) {
          const instance = new allLocalRules[rule.name]()
          input.label = instance.label
          input.description = instance.description
          input.config = instance.getConfig()
        } else {
          input.label = `Rule #${i}`
          input.description = `Test Rule #${i}`
        }
        savedRule = await app.platformatic.entities.rule.save({ input })
      }

      // store rule config
      if (rule.options) {
        const applicationId = rule.options.applicationId || null
        const ruleOptions = {
          ...rule.options
        }
        delete ruleOptions.applicationId
        await app.platformatic.entities.ruleConfig.save({
          input: {
            ruleId: savedRule.id,
            type: applicationId ? 'local' : 'global',
            options: ruleOptions,
            applicationId,
            enabled: rule.enabled
          }
        })
      } else {
        const input = {
          ruleId: savedRule.id,
          type: 'global',
          enabled: rule.enabled,
          options: {}
        }
        await app.platformatic.entities.ruleConfig.save({ input })
      }
    }
  }
  return app
}

async function startNpmMock (t, npmPackages = []) {
  const globalDispatcher = getGlobalDispatcher()
  setGlobalDispatcher(mockAgent)
  t.after(() => setGlobalDispatcher(globalDispatcher))

  const npmRegistryClient = mockAgent.get('https://registry.npmjs.org')
  t.after(() => npmRegistryClient.close())

  for (let i = 0; i < 5; i++) {
    for (const packageMetadata of npmPackages) {
      const packageName = packageMetadata.packageName
      const packageVersions = packageMetadata.packageVersions

      npmRegistryClient
        .intercept({ method: 'GET', path: `/${packageName}` })
        .reply(200, {
          name: packageName,
          versions: Object.fromEntries(
            packageVersions.map((version) => [version, {}])
          )
        })
    }
  }

  npmRegistryClient
    .intercept({ method: 'GET', path: /.*/ })
    .reply(404, 'Not found')

  return npmRegistryClient
}

module.exports = {
  startCompliance,
  startNpmMock,
  setUpEnvironment
}
