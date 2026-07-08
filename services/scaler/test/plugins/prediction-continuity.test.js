'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServerWithPlugins } = require('../helper')

const envPlugin = require('../../plugins/env')
const patternConfigPlugin = require('../../plugins/pattern-config')
const windowCategoryPlugin = require('../../plugins/window-category')
const patternPredictorPlugin = require('../../plugins/pattern-predictor')

// A coarse grid keeps the test fast: 8-hour windows → 3 windows/day, over 3 days = 9 windows.
const WINDOW_MINUTES = 480
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000
const WINDOWS_PER_DAY = (24 * 60) / WINDOW_MINUTES // 3
const MS_PER_DAY = 24 * 60 * 60 * 1000
const DAYS = 3

function snapshotPredictions (server, appId) {
  const { db, sql } = server.platformatic
  return db.query(sql`
    SELECT slot_start, predicted_pods FROM time_window_predictions WHERE application_id = ${appId}
  `).then((res) => {
    const map = new Map()
    for (const r of (res.rows || res || [])) map.set(new Date(r.slot_start).getTime(), r.predicted_pods)
    return map
  })
}

// The continuity contract: while the algorithm runs uninterrupted it regenerates the forecast on
// every window save, so each window that passes from future to history keeps exactly ONE frozen
// prediction — the last one made before it became current. The only windows without one are the
// first occurrence of each slot-of-day (the predictor has no prior sample for that slot yet), i.e.
// the whole first day here. From day 2 on, every window joins 1:1 to time_window_predictions on
// (application_id, slot_start) — no surrogate key needed.
test('every historical window (past the first per-slot occurrence) keeps its frozen 1:1 prediction', async (t) => {
  const server = await buildServerWithPlugins(t, {
    PLT_SCALER_TIME_WINDOW_MINUTES: String(WINDOW_MINUTES),
    PLT_SCALER_PATTERN_PREDICTION_DAYS: '2'
  }, [envPlugin, patternConfigPlugin, windowCategoryPlugin, patternPredictorPlugin])

  const { entities, db, sql } = server.platformatic
  const appId = randomUUID()
  const base = Date.UTC(2026, 0, 1) // a UTC midnight → aligned to the 8h window grid

  // Chronological windows: day 0..2 × slot 0..2. slotOfDay = slot+1 for these boundaries.
  const windows = []
  for (let day = 0; day < DAYS; day++) {
    for (let w = 0; w < WINDOWS_PER_DAY; w++) {
      const slotStart = base + day * MS_PER_DAY + w * WINDOW_MS
      windows.push({ day, slot: w, slotStart, pods: 5 + w * 3 + day })
    }
  }

  // Drive continuous operation: save one window, regenerate, snapshot the whole prediction table.
  const snapshots = []
  for (const win of windows) {
    await entities.timeWindowStat.save({
      input: {
        applicationId: appId,
        slotStart: new Date(win.slotStart),
        slotEnd: new Date(win.slotStart + WINDOW_MS),
        slotOfDay: win.slot + 1,
        localSlotOfDay: win.slot + 1,
        pods: win.pods
      }
    })
    const written = await server.updatePredictions(appId)
    assert.ok(written > 0, 'a save regenerates the forecast')
    snapshots.push(await snapshotPredictions(server, appId))
  }

  const final = snapshots[snapshots.length - 1]

  for (let j = 0; j < windows.length; j++) {
    const win = windows[j]
    if (win.day === 0) {
      // First occurrence of this slot-of-day: unforecastable, so no row was ever written for it.
      assert.equal(final.has(win.slotStart), false,
        `day-0 window (slot ${win.slot}) must have no prediction`)
      continue
    }
    // Day ≥ 1: the run right before it became current (step j-1) forecast it, and no later run
    // touched it → the final value equals that frozen snapshot exactly.
    const beforeCurrent = snapshots[j - 1]
    assert.ok(beforeCurrent.has(win.slotStart),
      `window (day ${win.day}, slot ${win.slot}) was forecast before it became current`)
    assert.ok(final.has(win.slotStart),
      `window (day ${win.day}, slot ${win.slot}) still has its prediction`)
    assert.equal(final.get(win.slotStart), beforeCurrent.get(win.slotStart),
      'the persisted prediction is frozen at the last value made before the window became current')
  }

  // The join is intrinsic — (application_id, slot_start) is unique on both tables and both live on
  // the same UTC window grid. Inner-join = exactly the day ≥ 1 windows, one prediction each.
  const joined = await db.query(sql`
    SELECT s.slot_start, s.pods, p.predicted_pods
    FROM time_window_stats s
    JOIN time_window_predictions p
      ON p.application_id = s.application_id AND p.slot_start = s.slot_start
    WHERE s.application_id = ${appId}
    ORDER BY s.slot_start
  `)
  const joinRows = joined.rows || joined || []
  const expectedJoined = windows.filter((w) => w.day >= 1).length
  assert.equal(joinRows.length, expectedJoined, 'every window past the warm-up joins 1:1')

  // Cleanup while the pool is alive.
  await db.query(sql`DELETE FROM time_window_predictions WHERE application_id = ${appId}`)
  await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${appId}`)
})
