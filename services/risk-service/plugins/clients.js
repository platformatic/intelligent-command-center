'use strict'

const path = require('node:path')
const { registerClients } = require('../../../lib/clients-plugin')

const clientsDir = path.resolve(__dirname, '..', '..', '..', 'clients')

module.exports = registerClients([
  { name: 'coldStorage', applicationId: 'risk-cold-storage', schema: path.join(clientsDir, 'risk-cold-storage/coldStorage.openapi.json') },
  { name: 'trafficInspector', applicationId: 'traffic-inspector', schema: path.join(clientsDir, 'traffic-inspector/traffic-inspector.openapi.json') }
])
