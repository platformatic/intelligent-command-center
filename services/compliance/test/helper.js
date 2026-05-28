'use strict'

const { join } = require('node:path')
const platformaticDb = require('@platformatic/db')
const fastify = require('fastify')
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
    PLT_COMPLIANCE_RULES_DIR: 'test/fixtures/rules',
    PLT_CONTROL_PLANE_URL: 'http://127.0.0.1:3042'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function startCompliance (t, envOverride, rulesData) {
  setUpEnvironment(envOverride)

  const capability = await platformaticDb.create(join(__dirname, '..'), {
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
  await capability.init()
  const app = capability.getApplication()

  t.after(async () => {
    await capability.stop()
  })

  const { db, sql } = app.platformatic

  // save rules
  await capability.start()

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

async function startControlPlane (t, opts = {}) {
  const controlPlane = fastify({ keepAliveTimeout: 1 })

  controlPlane.get('/instances/', async (req) => {
    const machineId = req.query['where.machineId.eq']
    const applicationId = req.query['where.applicationId.eq']

    return opts?.getInstances({ machineId, applicationId }) ?? []
  })

  t.after(async () => {
    await controlPlane.close()
  })

  await controlPlane.listen({ port: 3042 })
  return controlPlane
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

function generateMachineHeaders (machineId, namespace = 'platformatic') {
  return {
    'x-plt-machine-id': machineId,
    'x-plt-machine-namespace': namespace
  }
}

module.exports = {
  startCompliance,
  startControlPlane,
  startNpmMock,
  setUpEnvironment,
  generateMachineHeaders
}
