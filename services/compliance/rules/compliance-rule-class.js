'use strict'

class ComplianceRule {
  constructor (opts) {
    this.config = {}
    this.dataKey = null
  }

  getConfig () {
    return this.config
  }

  setConfig (newConfig) {
    Object.keys(newConfig).forEach((key) => {
      if (this.config[key]) {
        this.config[key].value = newConfig[key]
      }
    })
    return this.config
  }

  getDataKey () {
    return this.dataKey
  }

  getConfigValue (configKey) {
    const k = this.config[configKey]
    if (k) {
      return k.value ?? k.default
    }
  }

  setConfigValue (configKey, value) {
    const k = this.config[configKey]
    if (k) {
      k.value = value
    }
    return k.value ?? k.default
  }

  async run (applicationData) {
    return { compliant: false, details: null }
  }
}

module.exports = ComplianceRule
