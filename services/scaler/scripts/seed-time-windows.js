'use strict'

// Seed demo time-window history for one application (by name) and trigger categorization +
// prediction — all through a single ICC endpoint.
//
// Generates per-window pod history with a realistic load shape (quiet nights, busy weekday business
// hours, lower weekends, slow growth, occasional spikes) and POSTs it to:
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

// Realistic per-window pod count: quiet overnight, ramp up morning, busy 09–17, decline evening;
// weekends lower; a slow upward trend across the whole range; light noise; the odd spike.
function podsFor (slotStartMs, dayIndex) {
  const d = new Date(slotStartMs)
  const hour = d.getUTCHours()
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6

  let shape
  if (hour >= 9 && hour <= 17) shape = 1.0
  else if (hour >= 7 && hour < 9) shape = 0.6
  else if (hour > 17 && hour <= 21) shape = 0.45
  else shape = 0.1

  const floor = 5
  const peak = 40 + dayIndex * 0.15 // grows ~+13 pods over ~3 months
  let value = floor + (peak - floor) * shape * (weekend ? 0.4 : 1)
  value += (Math.random() - 0.5) * 4 // noise
  if (Math.random() < 0.01) value *= 1.8 // rare spike
  return Math.max(1, Math.round(value))
}

function buildWindows () {
  const windowsPerDay = 1440 / WINDOW_MINUTES
  const total = Math.round(MONTHS * 30 * windowsPerDay)
  const firstStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS - total * WINDOW_MS

  const windows = []
  for (let i = 0; i < total; i++) {
    const slotStart = firstStart + i * WINDOW_MS
    const dayIndex = Math.floor((slotStart - firstStart) / DAY_MS)
    const intoDay = ((slotStart % DAY_MS) + DAY_MS) % DAY_MS
    const slotOfDay = Math.floor(intoDay / WINDOW_MS) + 1 // 1-based, matches lib/time-slot-stats
    windows.push({
      slotStart: new Date(slotStart).toISOString(),
      slotEnd: new Date(slotStart + WINDOW_MS).toISOString(),
      slotOfDay,
      pods: podsFor(slotStart, dayIndex)
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
