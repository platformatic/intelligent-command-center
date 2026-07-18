'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

const SLOT = 5 * 60 * 1000 // must match PLT_SCALER_TIME_SLOT_MINUTES=5 default

async function rows (server, appId) {
  const { db, sql } = server.platformatic
  const res = await db.query(sql`
    SELECT slot_start, slot_of_day, min_pods, max_pods, p50_pods, p75_pods, p90_pods, p95_pods, p99_pods
    FROM time_slot_stats WHERE application_id = ${appId} ORDER BY slot_start
  `)
  return res.rows || res || []
}

async function windowRows (server, appId) {
  const { db, sql } = server.platformatic
  const res = await db.query(sql`
    SELECT slot_start, slot_of_day, pods, actual_pods
    FROM time_window_stats WHERE application_id = ${appId} ORDER BY slot_start
  `)
  return res.rows || res || []
}

async function actualSlotRows (server, appId) {
  const { db, sql } = server.platformatic
  const res = await db.query(sql`
    SELECT actual_min_pods, actual_max_pods, actual_p50_pods, actual_p75_pods, actual_p90_pods
    FROM time_slot_stats WHERE application_id = ${appId} ORDER BY slot_start
  `)
  return res.rows || res || []
}

test('first slot is skipped; the next full slot persists with time-weighted percentiles', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 17, 0, 0) // a slot boundary

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  // Slot A (17:00-17:05) — first bucket, will be skipped
  await rt(4, base + 60000)
  // Roll into slot B (17:05-17:10): closes A (skip), opens B seeded with 4
  await rt(4, base + SLOT + 10000) // B head: 4 from [B, +10s)
  await rt(12, base + SLOT + 100000) // 12 from +100s
  await rt(8, base + SLOT + 240000) // 8 from +240s
  // Roll into slot C: closes B (persist), opens C
  await rt(8, base + 2 * SLOT + 5000)

  const persisted = await rows(server, appId)
  assert.equal(persisted.length, 1)
  const r = persisted[0]
  // B segments: 4 for [0,100s)=100s, 12 for [100,240s)=140s, 8 for [240,300s)=60s
  assert.equal(r.min_pods, 4)
  assert.equal(r.max_pods, 12)
  // sorted ascending [4,8,12] by duration 100s/60s/140s; 50% of 300s=150s lands in 8 (cum 160s)
  assert.equal(r.p50_pods, 8)
  assert.equal(r.p75_pods, 12)
  assert.equal(r.p90_pods, 12)
  // slot B starts at 17:05 UTC → slot_of_day = (17*60+5)/5 + 1 = 206
  assert.equal(r.slot_of_day, 206)
})

test('persists the actual-pods series into its own slot columns, weighted independently', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 17, 0, 0)

  // Same timings as the unclamped worked example; actual carries a distinct 2/6/4 series.
  await server.recordTarget(appId, { unclamped: 4, actual: 2 }, base + 60000) // slot A (skipped)
  await server.recordTarget(appId, { unclamped: 4, actual: 2 }, base + SLOT + 10000)
  await server.recordTarget(appId, { unclamped: 12, actual: 6 }, base + SLOT + 100000)
  await server.recordTarget(appId, { unclamped: 8, actual: 4 }, base + SLOT + 240000)
  await server.recordTarget(appId, { unclamped: 8, actual: 4 }, base + 2 * SLOT + 5000) // persists B

  const [r] = await actualSlotRows(server, appId)
  // actual segments: 2 for [0,100s), 6 for [100,240s), 4 for [240,300s) → sorted [2,4,6] dur 100/60/140
  assert.equal(r.actual_min_pods, 2)
  assert.equal(r.actual_max_pods, 6)
  assert.equal(r.actual_p50_pods, 4) // 50% of 300s = 150s lands in 4 (cum 160s)
  assert.equal(r.actual_p75_pods, 6)
  assert.equal(r.actual_p90_pods, 6)

  // and the unclamped column is unchanged by the new series
  const [u] = await rows(server, appId)
  assert.equal(u.min_pods, 4)
  assert.equal(u.max_pods, 12)
  assert.equal(u.p50_pods, 8)
})

test('a gap discards the open bucket and does not persist it', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 9, 0, 0)

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  await rt(3, base + 1000) // open A (first)
  await rt(5, base + SLOT + 1000) // roll to B (A skipped), B non-first
  await rt(5, base + SLOT + 120000)
  // Big gap: jump 5 slots ahead → discards B (NOT persisted), opens a fresh first bucket
  await rt(9, base + 6 * SLOT + 1000)

  assert.equal((await rows(server, appId)).length, 0)
})

test('recordTarget is idempotent on re-emit of the same slot', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 3, 0, 0)

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  const drive = async () => {
    await server.store.clearBucket(appId)
    await rt(2, base + 1000) // A (first)
    await rt(6, base + SLOT + 1000) // B non-first
    await rt(6, base + 2 * SLOT + 1000) // persist B
  }
  await drive()
  await drive() // same slot_start again → UNIQUE constraint rejects, caught + logged

  assert.equal((await rows(server, appId)).length, 1)
})

test('a closed window persists one averaged time_window_stats row', async (t) => {
  const server = await buildServer(t, { PLT_SCALER_TIME_WINDOW_MINUTES: '15' })
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 0, 10, 0) // start at 00:10 so 00:15-20 is non-first

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  await rt(4, base) // 00:10 → first bucket 00:10-15 (skipped)
  await rt(4, base + SLOT) // 00:15 → base slot 00:15-20 = 4
  await rt(8, base + 2 * SLOT) // 00:20 → 00:20-25 = 8
  await rt(12, base + 3 * SLOT) // 00:25 → 00:25-30 = 12
  await rt(5, base + 4 * SLOT) // 00:30 → persists 00:25-30, closes window [00:15,00:30)

  assert.ok((await rows(server, appId)).length >= 3)

  const wr = await windowRows(server, appId)
  assert.equal(wr.length, 1)
  const w = wr[0]
  // window [00:15,00:30): avg(4,8,12) = 8 for the stored percentile (each base slot is constant)
  assert.equal(w.pods, 8)
  // actual mirrors unclamped here (actual == unclamped in this drive)
  assert.equal(w.actual_pods, 8)
  // window starts 00:15 UTC, 15-min granularity → slot_of_day = floor(15/15)+1 = 2
  assert.equal(w.slot_of_day, 2)
})

test('an unclosed window produces no time_window_stats row', async (t) => {
  const server = await buildServer(t, { PLT_SCALER_TIME_WINDOW_MINUTES: '15' })
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 0, 10, 0)

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  await rt(4, base) // 00:10
  await rt(4, base + SLOT) // 00:15
  await rt(8, base + 2 * SLOT) // 00:20 (persists 00:15-20)
  await rt(12, base + 3 * SLOT) // 00:25 (persists 00:20-25; 00:25-30 still open)

  assert.equal((await windowRows(server, appId)).length, 0)
})

test('a partial window averages only the present base slots', async (t) => {
  const server = await buildServer(t, { PLT_SCALER_TIME_WINDOW_MINUTES: '15' })
  t.after(() => server.close())
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1, 0, 15, 0) // start on the window boundary → 00:15-20 is the first bucket (skipped)

  const rt = (v, ts) => server.recordTarget(appId, { unclamped: v, actual: v }, ts)
  await rt(9, base) // 00:15 → first bucket 00:15-20 (skipped)
  await rt(4, base + SLOT) // 00:20 → 00:20-25 = 4
  await rt(10, base + 2 * SLOT) // 00:25 → 00:25-30 = 10
  await rt(5, base + 3 * SLOT) // 00:30 → persists 00:25-30, closes window [00:15,00:30)

  const wr = await windowRows(server, appId)
  assert.equal(wr.length, 1)
  // only 00:20-25 (4) and 00:25-30 (10) exist; 00:15-20 was skipped → avg(4,10) = 7
  assert.equal(wr[0].pods, 7)
})
