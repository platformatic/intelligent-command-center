'use strict'

const { randomUUID } = require('node:crypto')
const { startMachinist } = require('../test/helper')

startMachinist(null, {
  getPodDetails: async (podId) => {
    return { image: randomUUID() }
  }
})
