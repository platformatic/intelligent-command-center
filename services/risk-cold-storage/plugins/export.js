'use strict'

const { tmpdir } = require('node:os')
const { join, resolve, basename } = require('node:path')
const { mkdtemp, rm, stat, writeFile } = require('node:fs/promises')
const { pipeline } = require('node:stream/promises')
const { createWriteStream } = require('fs')
const fp = require('fastify-plugin')
const Stringifier = require('newline-json').Stringifier
const { TABLES } = require('./constants')
const { zipFolder } = require('../lib/zip')
const { createManifest } = require('../lib/manifest')
const { calculateHMAC } = require('../lib/hmac')

async function plugin (app) {
  const { db, entities } = app.platformatic

  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
    app.log.debug('Exporter/importer is disabled')
    return
  }
  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER !== undefined && !app.env.PLT_RISK_COLD_STORAGE_EXPORTER) {
    app.log.debug('Exporter is disabled')
    return
  }

  async function getNotExportedDumps (tableName) {
    const { sql } = db
    const rows = await db.query(
      sql`SELECT distinct cast(dumped_at AS VARCHAR) AS "dumpedAt" FROM ${sql.ident(tableName)} WHERE exported_at IS NULL`)
    return rows.map(row => row.dumpedAt)
  }

  async function markAsExported (files) {
    const { sql } = db
    await db.tx(async (db) => {
      const tableDumps = {}
      for (const file of files) {
        const fileName = basename(file)
        const [table] = fileName.split('-')
        const dumpedAt = fileName.split(`${table}-`)[1]
        if (!tableDumps[table]) tableDumps[table] = []
        tableDumps[table].push(dumpedAt)
      }
      const operations = []
      for (const table in tableDumps) {
        const times = tableDumps[table]
        const inClause = '(' + times.map(d => `'${d}'`).join(',') + ')'
        const op = db.query(
          sql`UPDATE ${sql.ident(table)} SET exported_at = NOW() 
          WHERE dumped_at IN ${sql.__dangerous__rawValue(inClause)}
        `
        )
        operations.push(op)
      }
      return Promise.all(operations)
    })
  }

  // export to `filePath` all rows from `table`. Every `dumped_at` is a different file
  async function exportFromTable (table, exportDir) {
    const { sql } = db
    const dumps = await getNotExportedDumps(table)
    const exportOperations = []
    const files = []
    const dumpDates = []
    for (const dump of dumps) {
      dumpDates.push(dump)
      const filePath = resolve(join(exportDir, `${table}-${dump}`))
      files.push(filePath)
      app.log.debug(`Exporting ${table} from dump ${dump} to ${filePath}`)
      const query = sql`SELECT * FROM ${sql.ident(table)} WHERE dumped_at = ${dump}`

      exportOperations.push(pipeline(
        db.queryNodeStream(query),
        new Stringifier(),
        createWriteStream(filePath))
      )
    }
    await Promise.all(exportOperations)
    return { files, dumpDates }
  }

  async function exportData () {
    const logs = []
    app.log.info('Starting export')
    logs.push({ date: new Date(), level: 'info', msg: 'Starting Export' })
    const exportDir = await mkdtemp(join(tmpdir(), 'plt-icc-export'))
    const zipDir = await mkdtemp(join(tmpdir(), 'plt-icc-export-zip'))
    try {
      const files = []
      const dumpDates = []
      for (const table of TABLES) {
        const { files: tableFiles, dumpDates: tableDumps } = await exportFromTable(table, exportDir)
        files.push(...tableFiles)
        dumpDates.push(...tableDumps)
      }

      if (files.length !== 0) {
        const latestDataAcquiredAt = new Date(Math.max(...dumpDates.map(d => new Date(d).getTime()))).toISOString()

        app.log.info(`Exported ${files.length} files to ${exportDir}`)
        logs.push({ date: new Date(), level: 'info', msg: `Exported ${files.length} files to ${exportDir}` })

        // Create the zip manifest
        const dbVersion = await app.getCurrentDBVersion()
        await createManifest(exportDir, dbVersion, files, latestDataAcquiredAt, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
        logs.push({ date: new Date(), level: 'info', msg: 'Created bundle manifest.json' })

        // Zip the files
        const name = `${new Date().toISOString()}`
        const zipName = `${name}.zip`
        const zipFilePath = join(zipDir, `${zipName}`)
        await zipFolder(exportDir, zipFilePath)
        app.log.info(`Zipped ${files.length} files to ${zipFilePath}`)
        logs.push({ date: new Date(), level: 'info', msg: `Zipped ${files.length} files to ${zipFilePath}` })

        // Create the zip hmac-sha256
        const hmac = await calculateHMAC(zipFilePath, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)
        const signatureFilePath = join(zipDir, `${name}.sign`)
        await writeFile(signatureFilePath, hmac)

        // Updload the zip file and the signature
        await app.storage.uploadFiles([zipFilePath, signatureFilePath])
        app.log.info(`Uploaded ${zipFilePath} and ${signatureFilePath} to storage successfully`)
        logs.push({ date: new Date(), level: 'info', msg: `Uploaded ${zipFilePath} and ${signatureFilePath} to storage successfully` })

        await markAsExported(files)

        const fileSize = (await stat(zipFilePath)).size // size in bytes

        await rm(exportDir, { recursive: true, force: true })
        await rm(zipDir, { recursive: true, force: true })

        await entities.importsExport.save({
          input: {
            success: true,
            isExport: true,
            synchedAt: new Date(),
            fileName: zipName,
            fileSize,
            logs: JSON.stringify(logs),
            hmac,
            latestDataAcquiredAt
          }
        })
      } else {
        app.log.warn('No data to export')
        logs.push({ date: new Date(), level: 'warn', msg: 'No data to export' })
        logs.push({ date: new Date(), level: 'info', msg: 'Export completed' })
        await entities.importsExport.save({
          input: {
            success: true,
            isExport: true,
            synchedAt: new Date(),
            logs: JSON.stringify(logs)
          }
        })
      }
    } catch (e) {
      app.log.error('error exporting data', e)
      console.error(e)
      logs.push({ date: new Date(), level: 'error', msg: e.message })
      await entities.importsExport.save({
        input: {
          success: false,
          isExport: true,
          synchedAt: new Date(),
          logs: JSON.stringify(logs)
        }
      })
      throw e
    }
  }

  app.decorate('exportData', exportData)
}

module.exports = fp(plugin, {
  name: 'export',
  dependencies: ['env', 's3']
})
