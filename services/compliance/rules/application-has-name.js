'use strict'

const { MissingDataError } = require('../lib/errors')
const ComplianceRule = require('./compliance-rule-class')

class ApplicationHasName extends ComplianceRule {
  constructor () {
    super()
    this.label = 'Application has name'
    this.name = 'application-has-name'
    this.dataKey = 'applicationName'
    this.description = 'Checks the application has a name.'
    this.config = {
      minLength: {
        type: 'number',
        description: 'Min length of application name',
        default: 0
      },
      maxLength: {
        type: 'number',
        description: 'Max length of application name',
        default: Number.MAX_VALUE
      }
    }
  }

  async run (applicationData) {
    const data = applicationData[this.dataKey]
    if (data) {
      const maxLength = this.getConfigValue('maxLength')
      const minLength = this.getConfigValue('minLength')
      const compliant = data && data.length >= minLength && data.length <= maxLength

      return {
        compliant,
        details: {
          name: data,
          minLength,
          maxLength: maxLength === Number.MAX_VALUE ? null : maxLength
        }
      }
    }
    // no data available
    throw new MissingDataError(this.label, this.dataKey)
  }
}

module.exports = ApplicationHasName
