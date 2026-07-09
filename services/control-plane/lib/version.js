'use strict'

const crypto = require('node:crypto')

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function base62 (buf) {
  let num = BigInt('0x' + buf.toString('hex'))
  let out = ''
  while (num > 0n) {
    out = BASE62[Number(num % 62n)] + out
    num /= 62n
  }
  return out
}

// The single place ICC mints a deployment version when a deploy carries no
// explicit one (no `version` in the body, no `plt.dev/version` label). Vercel-shaped
// -- `plt_` + 24 base62 chars -- derived deterministically from the image reference,
// so every call site agrees without coordination and repeated pods of the same image
// resolve to the same version. Returns null when the image is absent or is not a real
// ref (no ':' -- e.g. a bare name), matching the previous "only version tagged images"
// behavior; the caller then falls to 'local'. Nothing else (deployment-builder, desk,
// watt-extra, World) derives it; they read the value ICC resolved.
function deriveVersion (image) {
  if (!image || !String(image).includes(':')) return null
  const hash = crypto.createHash('sha256').update(String(image)).digest()
  return 'plt_' + base62(hash).slice(0, 24)
}

module.exports = { deriveVersion }
