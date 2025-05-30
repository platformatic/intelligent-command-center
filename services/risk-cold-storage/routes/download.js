'use strict'

module.exports = async function (app) {
  app.get('/download/:file', {
    handler: async (req, reply) => {
      const { file } = req.params
      const { entities } = app.platformatic
      const { importsExport } = entities
      const imported = await importsExport.find({ where: { fileName: { eq: file } } })
      if (!imported || imported.length === 0) {
        reply.status(404)
        return { error: 'File not found' }
      }

      reply.header('Content-Disposition', `attachment; filename="${file}"`)
      const fileStream = await app.storage.getFileStream(file)
      return reply.send(fileStream)
    }
  })
}
