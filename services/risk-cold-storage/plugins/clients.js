'use strict'

const path = require('node:path')
const { registerClients } = require('../../../lib/clients-plugin')

const clientsDir = path.resolve(__dirname, '..', '..', '..', 'clients')

module.exports = registerClients([
  { name: 'riskService', applicationId: 'risk-service', schema: path.join(clientsDir, 'risk-service/risk-service.openapi.json') }
])
