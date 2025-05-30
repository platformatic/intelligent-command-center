'use strict'

module.exports = async function (app) {
  // This triggers import or export (pickup-dropoff) depending on configuration
  app.get('/sync', {
    handler: async (request) => {
      if (process.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
        app.log.info('Exporter/importer is disabled, doing nothing')
        return { status: 'disabled' }
      }

      if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER) {
        const { riskService } = request

        // When we do the export, we force the dump (from redis to cold storage),
        // otherwise we won't have on postgres the latest data.
        await riskService.getDump()

        await app.exportData()
        return { status: 'exported' }
      } else {
        await app.importData()
        return { status: 'imported' }
      }
    }
  })

  app.get('/sync/available', {
    handler: async () => {
      if (process.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
        app.log.info('Exporter/importer is disabled, doing nothing')
        return { status: 'disabled' }
      }

      if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER) {
        return { status: 'disabled' }
      }

      const files = await app.availableImports()
      return files
    }
  })

  app.get('/sync/latest', {
    handler: async () => {
      if (process.env.PLT_RISK_COLD_STORAGE_EXPORTER === undefined) {
        app.log.info('Exporter/importer is disabled, doing nothing')
        return { status: 'disabled' }
      }

      if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER) {
        return { status: 'disabled' }
      }

      const latestDataAcquiredAt = await app.getLatestDataAcquiredAt()
      return {
        latestDataAcquiredAt
      }
    }
  })

  app.get('/sync/config', {
    handler: async () => {
      const enabled = process.env.PLT_RISK_COLD_STORAGE_EXPORTER !== undefined
      const isExporter = enabled && app.env.PLT_RISK_COLD_STORAGE_EXPORTER
      const isImporter = enabled && !isExporter
      let target
      if (app.env.PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE === 's3') {
        target = `s3://${app.env.PLT_RISK_COLD_STORAGE_AWS_BUCKET}`
      } else {
        target = 'unknown' // We support only s3 so far
      }
      if (!enabled) {
        return {
          enabled
        }
      }

      return {
        enabled,
        isExporter,
        isImporter,
        target
      }
    }
  })
}
