'use strict'

const semver = require('semver')
const { Pool, interceptors } = require('undici')
const { MissingDataError } = require('../lib/errors')
const ComplianceRule = require('./compliance-rule-class')

const MAX_CONCURRENT_REQUESTS = 10

class OutdatedNpmDeps extends ComplianceRule {
  constructor (options = {}) {
    super()
    this.label = 'Application does not have outdated npm dependencies'
    this.name = 'outdated-npm-deps'
    this.dataKey = 'npmDependencies'
    this.description = 'Checks application npm dependencies.'

    this.pool = options.dispatcher ?? new Pool('https://registry.npmjs.org', {
      connections: MAX_CONCURRENT_REQUESTS,
      interceptors: [interceptors.retry()]
    })
  }

  async run (applicationData) {
    const metadata = applicationData[this.dataKey]
    if (!metadata) {
      throw new MissingDataError(this.label, this.dataKey)
    }

    const { runtime, services } = metadata

    let compliant = true
    const details = { runtime: {}, services: {} }

    const checkRuntimeDependencies = async () => {
      const { hasOutdated, dependencies } = await this.#getPackageDependencies(
        runtime.current,
        runtime.dependencies
      )
      compliant = compliant && !hasOutdated
      details.runtime = dependencies
    }

    const checkServiceDependencies = async (serviceName) => {
      const serviceDeps = services[serviceName]
      const { hasOutdated, dependencies } = await this.#getPackageDependencies(
        serviceDeps.current,
        serviceDeps.dependencies
      )
      compliant = compliant && !hasOutdated
      details.services[serviceName] = dependencies
    }

    await Promise.all([
      checkRuntimeDependencies(),
      ...Object.keys(services).map((s) => checkServiceDependencies(s))
    ])

    return { compliant, details }
  }

  async #getPackageDependencies (currentDependencies, wantedDependenciesRanges) {
    const dependencies = {}

    let hasOutdated = false
    const results = await Promise.allSettled(
      Object.keys(wantedDependenciesRanges).map(async (packageName) => {
        const packageMetadata = await this.#getNpmPackageMetadata(packageName)
        const packageVersions = Object.keys(packageMetadata.versions)

        const currentVersion = currentDependencies[packageName]
        if (!currentVersion) return

        const wantedVersionRange = wantedDependenciesRanges[packageName]
        const wantedVersion = semver.maxSatisfying(packageVersions, wantedVersionRange)
        if (wantedVersion === null) {
          throw new Error(`Failed to find "${packageName}" package version that satisfies "${wantedVersionRange}".`)
        }

        const outdated = semver.lt(currentVersion, wantedVersion)
        hasOutdated = hasOutdated || outdated

        dependencies[packageName] = {
          outdated: semver.lt(currentVersion, wantedVersion),
          current: currentVersion,
          wanted: wantedVersion
        }
      })
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(result.reason)
      }
    }

    return { hasOutdated, dependencies }
  }

  async #getNpmPackageMetadata (packageName) {
    const { statusCode, body } = await this.pool.request({
      method: 'GET',
      path: `/${packageName}`
    })

    if (statusCode !== 200) {
      const error = await body.text()
      throw new Error(`Failed to fetch metadata for ${packageName}, error: ${error}`)
    }

    const metadata = await body.json()
    return metadata
  }
}

module.exports = OutdatedNpmDeps
