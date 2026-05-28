'use strict'

const path = require('node:path')
const { registerClients } = require('../../../lib/clients-plugin')

const clientsDir = path.resolve(__dirname, '..', '..', '..', 'clients')

module.exports = registerClients([
  { name: 'activities', applicationId: 'activities', schema: path.join(clientsDir, 'activities/activities.openapi.json') },
  { name: 'metrics', applicationId: 'metrics', schema: path.join(clientsDir, 'metrics/metrics.openapi.json') },
  { name: 'scaler', applicationId: 'scaler', schema: path.join(clientsDir, 'scaler/scaler.openapi.json') },
  { name: 'trafficInspector', applicationId: 'traffic-inspector', schema: path.join(clientsDir, 'traffic-inspector/traffic-inspector.openapi.json') }
])
