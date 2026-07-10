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
// explicit one (no `version` in the body, no `plt.dev/version` label).
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

// Extract the `sha256:...` digest portion from an image reference. Accepts a
// digest ref (`repo@sha256:...` -> `sha256:...`) or a bare digest (`sha256:...`).
function digestOf (ref) {
  const s = String(ref)
  const at = s.indexOf('@')
  if (at >= 0) return s.slice(at + 1)
  if (s.startsWith('sha256:')) return s
  return null
}

// The reference to mint a version from: a canonical `repo:tag@sha256:...` so the
// version changes if EITHER the tag or the resolved content digest changes. This
// gives per-rollout identity for unique tags AND detects content changes under a
// mutable tag like `:latest`.
//   - `image` (the pod spec ref) already carries a digest -> use it verbatim; it
//     is already content-addressed, so there is no race.
//   - a tag ref plus a resolved `imageDigest` -> combine into `tag@digest`.
//   - a tag ref but no digest yet (kubelet has not written status.imageID) ->
//     return null so the caller RETRIES rather than minting a tag-only id that a
//     later digest-bearing registration would supersede (that is the version
//     churn we are eliminating).
function combineImageRef (image, imageDigest) {
  if (!image) return null
  if (String(image).includes('@sha256:')) return String(image)
  if (!imageDigest) return null
  const digest = digestOf(imageDigest)
  if (!digest) return null
  return `${image}@${digest}`
}

module.exports = { deriveVersion, combineImageRef }
