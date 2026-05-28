'use strict'

const path = require('node:path')
const { registerClients } = require('../../../../lib/clients-plugin')

const clientsDir = path.resolve(__dirname, '..', '..', '..', '..', 'clients')

module.exports = registerClients([
  { name: 'activities', applicationId: 'activities', schema: path.join(clientsDir, 'activities/activities.openapi.json') }
])
