'use strict'

const { request } = require('undici')
const semver = require('semver')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getLatestPlatformaticVersion', async function (pkgs) {
    const output = {}
    const proms = pkgs.map((pkg) => {
      return request(`https://registry.npmjs.org/${pkg}`)
    })

    const results = await Promise.all(proms)
    for (let i = 0; i < results.length; i++) {
      const packageName = pkgs[i]
      const res = results[i]
      if (res.statusCode === 200) {
        const json = await res.body.json()

        // Get all versions, but filter out pre-releases, betas, etc.
        const versions = Object.keys(json.versions).filter(v => {
          return semver.valid(v) && !semver.prerelease(v)
        })

        const latestVersion = json['dist-tags'].latest
        const latestMajor = semver.major(latestVersion)

        // Group versions by major version
        const versionsByMajor = {}
        versions.forEach(v => {
          const major = semver.major(v)
          if (!versionsByMajor[major]) {
            versionsByMajor[major] = []
          }
          versionsByMajor[major].push(v)
        })

        // Get the latest version for each major
        const latestPerMajor = {}
        Object.keys(versionsByMajor).forEach(major => {
          const majorVersions = versionsByMajor[major]

          // For the current latest major, use the dist-tags.latest version
          if (parseInt(major) === latestMajor) {
            latestPerMajor[major] = latestVersion
          } else {
            // For other majors, use the highest semver version
            majorVersions.sort(semver.rcompare)
            latestPerMajor[major] = majorVersions[0]
          }
        })

        output[packageName] = latestPerMajor
      } else {
        output[packageName] = null
      }
    }
    return output
  })
})
