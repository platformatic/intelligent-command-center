'use strict'

function computeBackoff (opts) {
  opts ||= {}
  opts.maxRetries ||= Number.MAX_SAFE_INTEGER
  if (!(opts.maxRetries >= 1)) {
    throw new Error('backoff requires maxRetries greater or equal to one')
  }
  const maxRetries = opts.maxRetries
  let retries = opts.retries || 0
  const waitFor = 100 * Math.pow(2, retries)
  if (retries++ >= maxRetries) {
    return false
  }
  return { retries, maxRetries, waitFor }
}

module.exports.computeBackoff = computeBackoff
