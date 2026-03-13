'use strict'

async function shouldExpire (version, { getVersionRPS }) {
  const rps = await getVersionRPS(version.appLabel, version.versionLabel)
  if (rps === null) return false
  return rps === 0
}

module.exports = { shouldExpire, forceExpire: null }
