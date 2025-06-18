'use strict'

const { test } = require('node:test')
const { bootstrap } = require('../helper')
const { join } = require('node:path')
const { readdir } = require('node:fs/promises')
const assert = require('node:assert')

test('get the db version', async (t) => {
  const app = await bootstrap(t, {
    PLT_RISK_COLD_STORAGE_EXPORTER: false,
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: 's3'
  })

  const version = await app.getCurrentDBVersion()
  const migrationsPath = join(__dirname, '..', '..', 'migrations')
  const migrationFiles = (await readdir(migrationsPath)).sort()
  const latestMigration = migrationFiles[migrationFiles.length - 1]
  const migrationLatestVersion = parseInt(latestMigration.split('.')[0])
  assert.equal(version, migrationLatestVersion)
})
