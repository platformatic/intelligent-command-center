'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { buildServer } = require('@platformatic/service')

function getConfig (overrides) {
  return {
    PLT_UPDATES_REDIS_HOST: 'localhost',
    PLT_UPDATES_REDIS_PORT: 6343,
    PLT_UPDATES_REDIS_DB: 1,
    ...overrides
  }
}
function setUpEnvironment (env = {}) {
  Object.assign(process.env, getConfig(env))
}
async function getServer (t, env = {}) {
  setUpEnvironment(env)
  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  // Add your config customizations here. For example you want to set
  // all things that are set in the config file to read from an env variable
  config.server ||= {}
  config.server.logger ||= {
    level: 'error'
  }
  config.watch = false

  // Add your config customizations here
  const server = await buildServer(config)
  t && t.after(async () => {
    await server.close()
    delete process.env.PLT_UPDATES_REDIS_HOST
    delete process.env.PLT_UPDATES_REDIS_PORT
    delete process.env.PLT_UPDATES_REDIS_DB
  })

  return server
}

module.exports.getServer = getServer
