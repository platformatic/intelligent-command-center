'use strict'

const fp = require('fastify-plugin')

// Recursively merge `patch` into `base`. Plain objects are merged key-by-key; everything else
// (arrays, primitives, null) replaces the base value. Arrays-replace matches how the pattern
// predictor uses this — a fresh categoryThresholds.values is the new full list, not something to
// splice into the old one.
function deepMerge (base, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch
  const isMergeable = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  const out = isMergeable(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isMergeable(v) && isMergeable(out[k]) ? deepMerge(out[k], v) : v
  }
  return out
}

// Per-app pattern-predictor config: a free-form JSONB blob (see migration 019) that carries
// user-set inputs (currently timeWindowMinutes — the aggregation window the predictor operates
// on) alongside derived outputs (currently categoryThresholds). The blob is intentionally
// schema-less so new UI-facing keys can be added without a migration. This plugin owns the
// write surface; reads go through Platformatic's auto-generated `applicationPatternConfig`
// entity API.
module.exports = fp(async function (app) {
  const { sql, db } = app.platformatic
  const defaultTimeWindowMinutes = app.env.PLT_SCALER_TIME_WINDOW_MINUTES

  // Deep-merge `patch` into the app's config, upserting the row when missing. Fetches the current
  // row, merges in Node (so a partial patch like { categoryThresholds: { updatedAt: '…' } } keeps
  // the sibling `values`/`categoriesCount` intact — plain JSONB `||` would replace the whole
  // subtree), then writes the merged blob back. Arrays are replaced wholesale, not element-merged.
  // On INSERT we seed timeWindowMinutes from the current env default so the blob is useful to the
  // UI from the first write; on subsequent updates a user-customized value survives untouched
  // because the deep merge only writes keys the patch mentions.
  app.decorate('updatePatternConfig', async (applicationId, patch) => {
    const existing = (await app.platformatic.entities.applicationPatternConfig.find({
      where: { applicationId: { eq: applicationId } },
      limit: 1
    }))[0]
    const base = existing?.config ?? { timeWindowMinutes: defaultTimeWindowMinutes }
    const merged = deepMerge(base, patch)
    const mergedJson = JSON.stringify(merged)
    await db.query(sql`
      INSERT INTO application_pattern_configs (application_id, config, updated_at)
      VALUES (${applicationId}, ${mergedJson}::jsonb, NOW())
      ON CONFLICT (application_id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = NOW()
    `)
  })
}, {
  name: 'pattern-config',
  dependencies: ['env']
})
