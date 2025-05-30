'use strict'

const { join, resolve } = require('node:path')
const { readdir } = require('node:fs/promises')
const { buildServer } = require('@platformatic/db')
const { mockClient: awsMockClient } = require('aws-sdk-client-mock')
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')

const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/cold_storage'

function setUpEnvironment (env = {}) {
  const defaultEnv = {}

  Object.assign(process.env, defaultEnv, env)
}

function dbConfig () {
  return {
    server: {
      hostname: '127.0.0.1',
      port: 0,
      logger: {
        level: 'silent'
      }
    },
    db: {
      connectionString,
      ignore: {
        versions: true
      },
      events: false
    },
    migrations: {
      dir: resolve(__dirname, '..', 'migrations'),
      table: 'versions',
      autoApply: true
    },
    plugins: {
      paths: [
        resolve(__dirname, '..', 'plugins', 'env.js'),
        resolve(__dirname, '..', 'plugins', 'storage', 's3.js'),
        resolve(__dirname, '..', 'plugins', 'import.js'),
        resolve(__dirname, '..', 'plugins', 'export.js'),
        resolve(__dirname, '..', 'plugins', 'dbversion.js'),
        resolve(__dirname, '..', 'routes', 'paths.js'),
        resolve(__dirname, '..', 'routes', 'db-ops.js'),
        resolve(__dirname, '..', 'routes', 'latencies.js'),
        resolve(__dirname, '..', 'routes', 'download.js'),
        resolve(__dirname, '..', 'routes', 'sync.js')
      ]
    },
    watch: false
  }
}

const clear = async function (server) {
  const db = server.platformatic.db
  const sql = db.sql
  try {
    await db.query(sql`
  delete from calculations;
  delete from paths;
  delete from db_operations;
  delete from latencies;
  delete from imports_exports;
`)
  } catch (err) {
    console.log('error deleting info', err)
  }
}
module.exports.clear = clear

const dropTables = async (server) => {
  const db = server.platformatic.db
  const sql = db.sql
  try {
    await db.query(sql`
  drop table versions;
  drop table paths;
  drop table calculations;
  drop table db_operations;
  drop table latencies;
  drop table imports_exports;
  drop type query_type;
`)
  } catch (err) {
    console.log('error dropping tables', err)
  }
}

module.exports.bootstrap = async function bootstrap (t, env = {}, clients = {}) {
  process.env = {}

  let server = null
  t.after(async () => {
    if (server) {
      await dropTables(server)
      await server.close()
    }
  })
  setUpEnvironment(env)
  const options = dbConfig()
  server = await buildServer(options)

  // We inject here the mocked "clients" for other runtime's services
  server.addHook('preHandler', (req, _reply, done) => {
    for (const [key, value] of Object.entries(clients)) {
      req[key] = value
    }
    done()
  })

  await clear(server)

  await server.start()
  return server
}

module.exports.mockS3Commands = (t, { getObjectCommand = {}, listObjectsCommand = {}, putObjectCommand = {} }) => {
  const client = awsMockClient(S3Client)
  t.after(() => client.restore())

  if (getObjectCommand.resolve) {
    client.on(GetObjectCommand).resolves(getObjectCommand.resolve)
  }

  if (getObjectCommand.reject) {
    client.on(GetObjectCommand).rejects(getObjectCommand.reject)
  }

  if (listObjectsCommand.resolve) {
    client.on(ListObjectsV2Command).resolves(listObjectsCommand.resolve)
  }

  if (listObjectsCommand.reject) {
    client.on(ListObjectsV2Command).rejects(listObjectsCommand.reject)
  }

  if (putObjectCommand.resolve) {
    client.on(PutObjectCommand).resolves(putObjectCommand.resolve)
  }

  if (putObjectCommand.reject) {
    client.on(PutObjectCommand).rejects(putObjectCommand.reject)
  }
}

module.exports.dbVersionFromMigrations = async () => {
  const migrationsPath = join(__dirname, '..', 'migrations')
  const migrationFiles = (await readdir(migrationsPath)).sort()
  const latestMigration = migrationFiles[migrationFiles.length - 1]
  return parseInt(latestMigration.split('.')[0])
}
