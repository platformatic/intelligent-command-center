'use strict'

const { randomUUID } = require('node:crypto')
const { startMachinist } = require('../test/helper')

const db = {}
startMachinist(null, {
  getPodDetails: async (podId) => {
    if (!db[podId]) {
      db[podId] = { image: randomUUID() }
    }
    return db[podId]
  }
})
