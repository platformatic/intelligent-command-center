'use strict'

// Seed demo time-window history for one application (by name) and trigger categorization +
// prediction — all through a single ICC endpoint.
//
// Generates per-window pod history with a clear pattern shape (day 10, night 3, a rising evening
// ramp 17:00–21:00, and an extra Friday-evening bump) and POSTs it to:
//   POST {ICC}/scaler/applications/seed   { applicationName, windows }
// The endpoint resolves the app id via control-plane, replaces its window history, then recomputes
// categories and predictions.
//
// Run:
//   ICC_API_URL=https://icc.plt node scripts/seed-time-windows.js --app leads-demo
//
// Requires the seed endpoint to be whitelisted on the main service: PLT_SCALER_SEED_API_ENABLED=true.
// SEED_WINDOW_MINUTES must match the scaler's PLT_SCALER_TIME_WINDOW_MINUTES (default 60 = per-hour).

const { Agent } = require('undici')

const ICC_API_URL = (process.env.ICC_API_URL || 'https://icc.plt').replace(/\/+$/, '')
// Local k3d serves icc.plt with a self-signed cert Node won't trust, so skip TLS verification by
// default (this is a local demo seed). Set ICC_INSECURE_TLS=false to enforce cert validation.
const dispatcher = process.env.ICC_INSECURE_TLS === 'false'
  ? undefined
  : new Agent({ connect: { rejectUnauthorized: false } })
const WINDOW_MINUTES = Number(process.env.SEED_WINDOW_MINUTES || 60)
const MONTHS = Number(process.env.SEED_MONTHS || 3)

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const WINDOW_MS = WINDOW_MINUTES * MINUTE_MS

function cliValue (flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

// Per-window pod count with a clear pattern structure for the demo:
//   day (06:00–17:00)     → 10
//   evening (17:00–21:00) → a rising ramp: 13, 16, 19, 22 (one step per hour)
//   night (21:00–06:00)   → 3
//   Friday evening        → +8 on top of the ramp (a calendar effect over the baseline)
// Plus light ±1 noise so the predictor sees a real (not perfectly flat) series.
function podsFor (slotStartMs) {
  const d = new Date(slotStartMs)
  const hour = d.getUTCHours()
  const dow = d.getUTCDay()

  let value
  if (hour >= 21 || hour < 6) value = 3 // night
  else if (hour >= 17 && hour <= 20) { // evening ramp
    value = 13 + 3 * (hour - 17)
    if (dow === 5) value += 8 // Friday evening extra
  } else value = 10 // day

  value += (Math.random() - 0.5) * 2 // ±1 noise
  return Math.max(1, Math.round(value))
}

function buildWindows () {
  const windowsPerDay = 1440 / WINDOW_MINUTES
  const total = Math.round(MONTHS * 30 * windowsPerDay)
  const firstStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS - total * WINDOW_MS

  const windows = []
  for (let i = 0; i < total; i++) {
    const slotStart = firstStart + i * WINDOW_MS
    const intoDay = ((slotStart % DAY_MS) + DAY_MS) % DAY_MS
    const slotOfDay = Math.floor(intoDay / WINDOW_MS) + 1 // 1-based, matches lib/time-slot-stats
    windows.push({
      slotStart: new Date(slotStart).toISOString(),
      slotEnd: new Date(slotStart + WINDOW_MS).toISOString(),
      slotOfDay,
      pods: podsFor(slotStart)
    })
  }
  return windows
}

async function main () {
  const appName = cliValue('--app') || process.env.SEED_APP_NAME
  if (!appName) {
    console.error('usage: node scripts/seed-time-windows.js --app <application-name>')
    process.exit(1)
  }

  const windows = buildWindows()
  console.log(`seeding ${windows.length} ${WINDOW_MINUTES}-minute windows (~${MONTHS} months) for "${appName}"…`)

  const res = await fetch(`${ICC_API_URL}/scaler/applications/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ applicationName: appName, windows }),
    dispatcher
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`seed failed (${res.status}): ${text}`)
    process.exit(1)
  }
  console.log(text)
}

main().catch((err) => {
  console.error(err.message || err)
  if (err.cause) console.error('cause:', err.cause) // fetch hides the real reason here (TLS/DNS/refused)
  process.exit(1)
})
