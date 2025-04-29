'use strict'

const ApplicationHasName = require('./application-has-name')
const OutdatedNpmDeps = require('./outdated-npm-deps')

module.exports = {
  'application-has-name': ApplicationHasName,
  'outdated-npm-deps': OutdatedNpmDeps
}
