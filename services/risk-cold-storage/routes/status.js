'use strict'

module.exports = async function (app) {
  app.get('/status', async () => {
    return {
      isImporter: app.env.PLT_RISK_COLD_STORAGE_EXPORTER === false,
      isExporter: app.env.PLT_RISK_COLD_STORAGE_EXPORTER === true
    }
  })
}
