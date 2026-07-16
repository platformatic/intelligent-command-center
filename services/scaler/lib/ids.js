'use strict'

const { createHash } = require('node:crypto')

// Every time-window row is uniquely keyed by (application_id, slot_start) — the tables already
// enforce it. So we DERIVE the primary key from that natural key instead of randomising it:
//
//     id = uuidv5(NAMESPACE, '<table>|<application_id>|<slotStartMs>')
//
// Any slot's id then becomes computable from (table, app, slotStart) anywhere in the system, with no
// lookup. That is what lets a suggestion's calendar occurrences be GENERATED rather than fetched —
// and it keeps them correct for an ACCEPTED suggestion, whose stored id list would otherwise freeze
// at accept time and be entirely in the past a month later.
//
// `table` namespaces the hash so a stats row and a prediction row for the SAME slot never collide.
//
// The same trick names a suggestion's IDENTITY — the pattern it represents, (app, slot, scopeKeys).
// Note that is NOT the row id: a candidate row and an accepted row share one identity and have
// different ids.
//
// FROZEN: changing NAMESPACE or any name format orphans every id already stored, and must match
// migrations/015.do.sql.

const NAMESPACE = 'c1b0a3d4-7e2f-4a91-8b5c-6d0e9f2a3b71'
const NS_BYTES = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex')

// RFC 4122 v5: SHA-1 over (namespace || name), with the version/variant bits stamped in.
function uuidv5 (name) {
  const h = createHash('sha1').update(NS_BYTES).update(name, 'utf8').digest()
  h[6] = (h[6] & 0x0f) | 0x50 // version 5
  h[8] = (h[8] & 0x3f) | 0x80 // RFC 4122 variant
  const x = h.subarray(0, 16).toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`
}

// slot  → time_slot_stats           stats → time_window_stats
// pred  → time_window_predictions   sched → scheduled_slots
const SLOT_TABLES = new Set(['slot', 'stats', 'pred', 'sched'])

function slotId (table, applicationId, slotStart) {
  if (!SLOT_TABLES.has(table)) throw new Error(`unknown slot table: ${table}`)
  const ms = slotStart instanceof Date ? slotStart.getTime() : Number(slotStart)
  return uuidv5(`${table}|${applicationId}|${ms}`)
}

// The pattern a suggestion represents. scopeKeys are sorted so key order can never fork the identity.
function suggestionIdentity (applicationId, slotOfDay, scopeKeys) {
  const keys = [...scopeKeys].sort().join(',')
  return uuidv5(`suggestion|${applicationId}|${slotOfDay}|${keys}`)
}

// The CANDIDATE row for a pattern — derived, so regeneration reproduces the SAME id.
//
// Regeneration is a DELETE+INSERT of every 'suggested' row (that is how patterns the algorithm has
// stopped producing get pruned). With a random id, a pattern that is still detected would come back
// under a new id every night, and any client holding the old one — a dashboard that has not reloaded,
// a user about to click Accept — would 404 against a row that no longer exists.
//
// Only the candidate is derived. An ACCEPTED row keeps a random id: it is a snapshot, cancelled ones
// accumulate as history, and several can share one identity over time — so a derived id would collide
// with a suggestion the user accepted and cancelled last month.
function suggestionCandidateId (identity) {
  return uuidv5(`candidate|${identity}`)
}

module.exports = { slotId, suggestionIdentity, suggestionCandidateId, uuidv5, NAMESPACE }
