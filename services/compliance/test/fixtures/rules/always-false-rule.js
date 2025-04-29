'use strict'

const ComplianceRule = require('../../../rules/compliance-rule-class')

class AlwaysFalse extends ComplianceRule {
  constructor () {
    super()
    this.label = 'Always False'
    this.name = 'always-false'
    this.dataKey = null
    this.description = 'Returns always false.'
    this.config = {}
  }

  async run () {
    return { compliant: false }
  }
}
module.exports = AlwaysFalse
