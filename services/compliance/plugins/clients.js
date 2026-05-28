'use strict'

const path = require('node:path')
const { registerClients } = require('../../../lib/clients-plugin')

const clientsDir = path.resolve(__dirname, '..', '..', '..', 'clients')

module.exports = registerClients([
  { name: 'controlPlane', applicationId: 'control-plane', schema: path.join(clientsDir, 'control-plane/control-plane.openapi.json') }
])
