'use strict'

const { tmpdir } = require('node:os')
const { join, basename } = require('node:path')
const { mkdtemp, rm, readFile, readdir, stat } = require('node:fs/promises')
const { TABLES } = require('./constants')
const { getManifestFromFolder } = require('../lib/manifest')
const { checkAndExtractZip } = require('../lib/check-zip')
const { validateNDJSON } = require('../lib/validation')
const fp = require('fastify-plugin')

const MAXIMUM_IMPORT_ATTEMPTS = 10

async function plugin (app) {
  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
    app.log.debug('Exporter/importer is disabled')
    return
  }
  if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER !== undefined && app.env.PLT_RISK_COLD_STORAGE_EXPORTER) {
    app.log.debug('Importer is disabled')
    return
  }

  const { db, entities } = app.platformatic
  const { importsExport } = entities

  // We ignore the import that are not successful, and we try to import every file
  // that is more recent than the last successful import
  async function getLatestSuccessfulImportedFile (table) {
    const { sql } = db
    const rows = await db.query(
      sql`SELECT file_name FROM imports_exports WHERE is_export = false AND success = true
        ORDER BY synched_at DESC LIMIT 1`)
    return rows[0]?.file_name || null
  }

  // Import a file into a table
  // This is idempotent, if the file has already been imported, there will be no duplicates
  async function importFile (tx, table, filePath) {
    const { sql } = db
    const data = await readFile(filePath, 'utf8')
    validateNDJSON(table, data) // throws if invalid data for table
    const now = new Date().toISOString()
    const inputs = []
    for (const line of data.split('\n')) {
      if (line === '') continue
      const row = JSON.parse(line)
      row.imported_at = now
      inputs.push(row)
    }
    if (inputs.length === 0) {
      return
    }

    // We cannot use platformatic because we want the 'ON CONFLICT DO NOTHING' clause to avoid duplicates
    const keys = Object.keys(inputs[0])
    const keysVal = sql.join(
      keys.map((key) => sql.ident(key)),
      sql`, `
    )
    const values = inputs.map(row => keys.map(key => row[key]))
    const valuesVal = sql.join(
      values.map((row) => sql`(${sql.join(row.map((v) => sql`${v}`), sql`, `)})`),
      sql`, `
    )
    const query = sql`
      INSERT INTO ${sql.ident(table)} (${keysVal})
      VALUES ${valuesVal}
      ON CONFLICT DO NOTHING
    `
    return tx.query(query)
  }

  async function importTable (tx, table, filesDir) {
    const files = await readdir(filesDir)
    const filesForTable = files.filter(file => basename(file).startsWith(`${table}-`))
      .map(file => join(filesDir, file)).sort()

    // We import the files sequentially on purpose.
    for (const file of filesForTable) {
      await importFile(tx, table, file)
    }
  }

  async function importData () {
    app.log.info('Start importing')
    const lastImportedFile = await getLatestSuccessfulImportedFile()
    const importDir = await mkdtemp(join(tmpdir(), 'plt-icc-import'))
    const newFiles = await app.storage.downloadFiles(lastImportedFile, importDir)

    // We want to import the files in order, so if one import fails, we stop and we avoid "holes"
    const newFilesOrdered = newFiles.sort((a, b) => basename(a).localeCompare(basename(b)))

    const zipFiles = newFilesOrdered.filter(file => file.endsWith('.zip'))
    const signFiles = newFilesOrdered.filter(file => file.endsWith('.sign'))
    let error = null

    for (const zipFile of zipFiles) {
      const logs = []
      const fileName = basename(zipFile)
      const previousAttempts = await importsExport.find({
        where: {
          success: { eq: false },
          fileName: { eq: fileName }
        }
      })
      const previousAttempt = previousAttempts[0] || null

      if (previousAttempt?.importAttempts >= MAXIMUM_IMPORT_ATTEMPTS) {
        app.log.warn(`Import failed ${MAXIMUM_IMPORT_ATTEMPTS} times, skipping ${basename(zipFile)}`)
        await importsExport.save({
          input: {
            id: previousAttempt.id,
            discarded: true
          }
        })
      } else {
        try {
          const tempdir = await mkdtemp(join(tmpdir(), 'plt-icc-import'))
          const signFile = signFiles.find(file => {
            return basename(file, '.sign') === basename(zipFile, '.zip')
          })
          if (!signFile) {
            throw new Error(`No signature file found for ${basename(zipFile)}`)
          }

          const hmac = await readFile(signFile, 'utf-8')

          // size in bytes
          const fileSize = (await stat(zipFile)).size
          await checkAndExtractZip(zipFile, signFile, tempdir, app.env.PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY)

          // read the manifest to get the latest data acquired date
          const manifest = await getManifestFromFolder(tempdir)
          const latestDataAcquiredAt = new Date(manifest.latestDataAcquiredAt).toISOString()

          // import the files, all in one transaction
          await db.tx(async (tx) => {
            for (const table of TABLES) {
              await importTable(tx, table, tempdir)
            }
          })

          app.log.info(`Succesfully imported data from ${basename(zipFile)}`)
          logs.push({ date: new Date(), level: 'info', msg: `Succesfully imported data from ${basename(zipFile)}` })

          await rm(tempdir, { recursive: true, force: true })

          const fileName = basename(zipFile)

          const attemptLog = {
            success: true,
            isExport: false,
            synchedAt: new Date(),
            fileName,
            fileSize,
            logs: JSON.stringify(logs),
            hmac,
            latestDataAcquiredAt,
            importAttempts: 1
          }
          if (previousAttempt) {
            attemptLog.id = previousAttempt.id
            const prevAttempts = previousAttempt.importAttempts || 0
            attemptLog.importAttempts = prevAttempts + 1
          }

          await importsExport.save({ input: attemptLog })
        } catch (err) {
          app.log.error(err)
          logs.push({ date: new Date(), level: 'error', msg: err.message })

          const attemptLog = {
            success: false,
            isExport: false,
            synchedAt: new Date(),
            fileName: basename(zipFile),
            importAttempts: 1,
            logs: JSON.stringify(logs)
          }

          if (previousAttempt) {
            attemptLog.id = previousAttempt.id
            const prevAttempts = previousAttempt.importAttempts || 0
            attemptLog.importAttempts = prevAttempts + 1
          }
          await importsExport.save({ input: attemptLog })
          error = err

          // We stop the imports if one import fails
          break
        }
      }
    }
    await rm(importDir, { recursive: true, force: true })
    if (error) {
      // We throw the error if one import failed to avoid rolling back the attempt entry in
      // the database
      throw error
    }
  }

  async function availableImports () {
    const lastImportedFile = await getLatestSuccessfulImportedFile()
    const newFiles = await app.storage.availableFiles(lastImportedFile)
    const zipNewFiles = newFiles.filter(file => file.fileName.endsWith('.zip'))
    return zipNewFiles.sort((a, b) => basename(a.fileName).localeCompare(basename(b.fileName)))
  }

  async function getLatestDataAcquiredAt () {
    const { entities } = app.platformatic
    const { importsExport } = entities
    const lastImport = await importsExport.find({
      where: {
        isExport: { eq: false },
        success: { eq: true }
      },
      order: { by: 'latestDataAcquiredAt', direction: 'desc' }
    })

    return lastImport[0]?.latestDataAcquiredAt || null
  }

  app.decorate('importData', importData)
  app.decorate('availableImports', availableImports)
  app.decorate('getLatestDataAcquiredAt', getLatestDataAcquiredAt)
}

module.exports = fp(plugin, {
  name: 'import',
  dependencies: ['env', 's3']
})
