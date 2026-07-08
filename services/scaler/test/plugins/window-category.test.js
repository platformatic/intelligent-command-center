'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServerWithPlugins } = require('../helper')

const envPlugin = require('../../plugins/env')
const patternConfigPlugin = require('../../plugins/pattern-config')
const windowCategoryPlugin = require('../../plugins/window-category')

const WINDOW_MS = 15 * 60 * 1000 // default PLT_SCALER_TIME_WINDOW_MINUTES

// Seed one application's window pods (all within the last year) so updateWindowCategories sees them.
async function seed (entities, appId, podsLevels) {
  const now = Date.now()
  const inputs = podsLevels.map((pods, i) => {
    const slotStart = now - (i + 1) * WINDOW_MS
    return {
      applicationId: appId,
      slotStart: new Date(slotStart),
      slotEnd: new Date(slotStart + WINDOW_MS),
      slotOfDay: (i % 96) + 1,
      localSlotOfDay: (i % 96) + 1,
      pods
    }
  })
  for (let i = 0; i < inputs.length; i += 500) {
    await entities.timeWindowStat.insert({ inputs: inputs.slice(i, i + 500) })
  }
}

const categoryOf = async (entities, appId, pods) => {
  const rows = await entities.timeWindowStat.find({ where: { applicationId: { eq: appId }, pods: { eq: pods } }, limit: 1 })
  return rows[0].category
}
const rowsByPods = (entities, appId) =>
  entities.timeWindowStat.find({ where: { applicationId: { eq: appId } }, limit: 10000, orderBy: [{ field: 'pods', direction: 'asc' }] })

test('window-category — black box through updateWindowCategories (N=5, minPods=3)', async (t) => {
  const server = await buildServerWithPlugins(t, {}, [envPlugin, patternConfigPlugin, windowCategoryPlugin])
  const { entities, db, sql } = server.platformatic
  const BASELINE = 3
  const apps = []
  const fresh = () => { const id = randomUUID(); apps.push(id); return id }

  await t.test('an app with no windows returns null and does not error', async () => {
    assert.equal(await server.updateWindowCategories(randomUUID()), null)
  })

  await t.test('a flat app is all baseline', async () => {
    const appId = fresh()
    await seed(entities, appId, Array(40).fill(7))
    await server.updateWindowCategories(appId)
    for (const r of await rowsByPods(entities, appId)) assert.equal(r.category, BASELINE)
  })

  await t.test('on a small baseline, the resting level is green and a +50% bump is one warm step', async () => {
    const appId = fresh()
    await seed(entities, appId, [...Array(40).fill(4), 5, 6])
    await server.updateWindowCategories(appId)
    assert.equal(await categoryOf(entities, appId, 4), BASELINE, 'resting 4 is baseline')
    assert.equal(await categoryOf(entities, appId, 5), BASELINE, '5 is still baseline')
    assert.equal(await categoryOf(entities, appId, 6), BASELINE + 1, '6 (+50%) is one warm step, not red')
  })

  await t.test('a small bump on a big app is a small step, not the top category', async () => {
    const appId = fresh()
    // rests at 100; a moderate 108 and a big 140 — minStep scales to 10 (0.1×100)
    await seed(entities, appId, [...Array(100).fill(100), ...Array(5).fill(108), ...Array(5).fill(140)])
    await server.updateWindowCategories(appId)
    assert.equal(await categoryOf(entities, appId, 100), BASELINE, 'resting level is baseline')
    const c108 = await categoryOf(entities, appId, 108)
    assert.ok(c108 > BASELINE && c108 < 5, `a small % bump is a middle-warm step, got ${c108}`)
    assert.equal(await categoryOf(entities, appId, 140), 5, 'a big spike is the top category')
  })

  await t.test('resting level is baseline; busier is warmer, quieter is cooler', async () => {
    const appId = fresh()
    await seed(entities, appId, [...Array(100).fill(10), ...Array(30).fill(40), ...Array(20).fill(2)])
    assert.ok(Array.isArray(await server.updateWindowCategories(appId)), 'not flat')
    assert.equal(await categoryOf(entities, appId, 10), BASELINE)
    assert.ok((await categoryOf(entities, appId, 40)) > BASELINE, 'busy is warmer')
    assert.ok((await categoryOf(entities, appId, 2)) < BASELINE, 'quiet is cooler')
  })

  await t.test('categories are bounded 1..N and non-decreasing in load', async () => {
    const appId = fresh()
    await seed(entities, appId, Array.from({ length: 100 }, (_, i) => Math.floor(i / 2) + 1)) // pods 1..50
    await server.updateWindowCategories(appId)
    let prev = 0
    for (const r of await rowsByPods(entities, appId)) {
      assert.ok(r.category >= 1 && r.category <= 5, `category ${r.category}`)
      assert.ok(r.category >= prev, `category dropped at pods ${r.pods}`)
      prev = r.category
    }
    assert.equal(prev, 5, 'the busiest windows reach the top category')
  })

  await t.test('re-running is idempotent (the guard rewrites nothing)', async () => {
    const appId = fresh()
    await seed(entities, appId, [...Array(100).fill(10), ...Array(30).fill(40), ...Array(20).fill(2)])
    await server.updateWindowCategories(appId)
    const before = await categoryOf(entities, appId, 40)
    await server.updateWindowCategories(appId)
    assert.equal(await categoryOf(entities, appId, 40), before)
  })

  await t.test('thresholds and timeWindowMinutes are persisted on the pattern-config blob', async () => {
    const appId = fresh()
    await seed(entities, appId, [...Array(100).fill(10), ...Array(30).fill(40), ...Array(20).fill(2)])
    const returned = await server.updateWindowCategories(appId)

    const cfg = (await entities.applicationPatternConfig.find({ where: { applicationId: { eq: appId } }, limit: 1 }))[0].config
    assert.equal(cfg.timeWindowMinutes, 60, 'seeded from env default')
    assert.deepEqual(cfg.categoryThresholds.values, returned, 'stored values match what updateWindowCategories returned')
    assert.ok(cfg.categoryThresholds.values.every(Number.isInteger), 'thresholds are integers (ceil-rounded)')
    assert.equal(cfg.categoryThresholds.categoriesCount, 5)
    assert.ok(!Number.isNaN(Date.parse(cfg.categoryThresholds.updatedAt)))

    // Re-running refreshes thresholds without clobbering timeWindowMinutes even if the user has
    // customized it — simulate that customization by patching in a different value.
    await server.updatePatternConfig(appId, { timeWindowMinutes: 30 })
    await server.updateWindowCategories(appId)
    const cfg2 = (await entities.applicationPatternConfig.find({ where: { applicationId: { eq: appId } }, limit: 1 }))[0].config
    assert.equal(cfg2.timeWindowMinutes, 30, 'customization survives threshold refresh')
    assert.deepEqual(cfg2.categoryThresholds.values, returned)

    // Deep merge: a partial patch targeting one nested key preserves its siblings.
    await server.updatePatternConfig(appId, { categoryThresholds: { updatedAt: '2020-01-01T00:00:00.000Z' } })
    const cfg3 = (await entities.applicationPatternConfig.find({ where: { applicationId: { eq: appId } }, limit: 1 }))[0].config
    assert.equal(cfg3.categoryThresholds.updatedAt, '2020-01-01T00:00:00.000Z', 'nested key updated')
    assert.deepEqual(cfg3.categoryThresholds.values, returned, 'sibling values preserved')
    assert.equal(cfg3.categoryThresholds.categoriesCount, 5, 'sibling categoriesCount preserved')
    assert.equal(cfg3.timeWindowMinutes, 30, 'top-level sibling preserved')

    // Arrays replace wholesale, not element-merge.
    await server.updatePatternConfig(appId, { categoryThresholds: { values: [1, 2, 3, 4] } })
    const cfg4 = (await entities.applicationPatternConfig.find({ where: { applicationId: { eq: appId } }, limit: 1 }))[0].config
    assert.deepEqual(cfg4.categoryThresholds.values, [1, 2, 3, 4], 'array replaced, not merged')
  })

  for (const id of apps) {
    await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${id}`)
    await db.query(sql`DELETE FROM application_pattern_configs WHERE application_id = ${id}`)
  }
})

test('window-category — a bigger minPods keeps a modest-variance app all baseline', async (t) => {
  const server = await buildServerWithPlugins(t, { PLT_SCALER_WINDOW_MIN_PODS: '10' }, [envPlugin, patternConfigPlugin, windowCategoryPlugin])
  const { entities, db, sql } = server.platformatic
  const appId = randomUUID()
  await seed(entities, appId, [...Array(50).fill(8), ...Array(50).fill(14)]) // range 6 < minStep 10 → all baseline
  await server.updateWindowCategories(appId)
  for (const r of await rowsByPods(entities, appId)) assert.equal(r.category, 3)
  await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${appId}`)
  await db.query(sql`DELETE FROM application_pattern_configs WHERE application_id = ${appId}`)
})

test('window-category — works with N = 3 (baseline = 2)', async (t) => {
  const server = await buildServerWithPlugins(t, { PLT_SCALER_WINDOW_CATEGORIES: '3' }, [envPlugin, patternConfigPlugin, windowCategoryPlugin])
  const { entities, db, sql } = server.platformatic
  const appId = randomUUID()
  await seed(entities, appId, [...Array(100).fill(10), ...Array(30).fill(40), ...Array(20).fill(2)])
  await server.updateWindowCategories(appId)
  assert.equal(await categoryOf(entities, appId, 10), 2)
  assert.ok((await categoryOf(entities, appId, 40)) > 2)
  assert.ok((await categoryOf(entities, appId, 2)) < 2)
  await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${appId}`)
  await db.query(sql`DELETE FROM application_pattern_configs WHERE application_id = ${appId}`)
})
