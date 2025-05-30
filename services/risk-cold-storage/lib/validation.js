'use strict'
const Ajv = require('ajv')
const ajv = new Ajv()
const schema = require('./schemas')

// Validates the data against the table schema. Throws if data are not valid.
const validateNDJSON = (table, data) => {
  const tableSchema = schema[table]
  for (const line of data.split('\n')) {
    if (line.trim() === '') continue
    const dataObj = JSON.parse(line)
    const valid = ajv.validate(tableSchema, dataObj)
    if (!valid) {
      throw new Error(ajv.errorsText())
    }
  }
}

module.exports = { validateNDJSON }
