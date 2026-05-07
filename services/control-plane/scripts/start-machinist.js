'use strict'

const { randomUUID } = require('node:crypto')
const { startMachinist } = require('../test/helper')

const db = {}
startMachinist(null, {
  getMachineDetails: async (machineId) => {
    if (!db[machineId]) {
      db[machineId] = { image: randomUUID() }
    }
    return db[machineId]
  }
})
