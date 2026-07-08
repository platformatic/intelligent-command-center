'use strict'

const fp = require('fastify-plugin')

// Load-view categorization for one application's time windows. Postgres computes the three stats
// (median, p5, p95) over the trailing year and applies the result to the rows; the little rule
// below only turns those three numbers into category thresholds — it never sees a row or computes a
// percentile. Each window's `category` (1..N, diverging around the resting level: middle = baseline,
// lower = quieter, higher = busier) is refreshed on save; the guarded UPDATE only rewrites rows
// whose category actually changed, so the steady-state cost is a scan, not a full rewrite.

// The ascending pod-value thresholds between the N categories (N−1 of them), from an app's stats.
// Bands step outward from the median (the resting level → baseline). Each band is at least `minStep`
// wide, where minStep = max(minPods, minFraction × median): an absolute pod floor for tiny apps, and
// a fraction of the resting level for big ones — so the same relative swing categorizes the same at
// any scale (a 5-pod bump is a big deal at 5 pods, noise at 100). A near-flat app just has every
// window fall in the baseline band. Below/above widths are asymmetric — a load range usually has
// more room above the resting level than below.
//
// Thresholds are rounded UP to integers so the persisted values match what the UI shows and the
// SQL applies. The SQL uses `pods < threshold` with integer pods; `ceil` is the only rounding
// direction that preserves the categorization exactly — `pods < 5.5` and `pods < 6` accept the
// same integers, while floor or round shift the boundary and reassign pods=5 to a different band.
function categoryThresholds ({ median, p5, p95 }, { categoriesCount, minPods, minFraction }) {
  const half = (categoriesCount - 1) / 2
  const minStep = Math.max(minPods, minFraction * median)
  const belowWidth = Math.max(minStep, (median - p5) / half)
  const aboveWidth = Math.max(minStep, (p95 - median) / half)

  const thresholds = []
  for (let i = half - 1; i >= 0; i--) {
    thresholds.push(Math.ceil(median - (i + 0.5) * belowWidth))
  }
  for (let i = 0; i < half; i++) {
    thresholds.push(Math.ceil(median + (i + 0.5) * aboveWidth))
  }
  return thresholds
}

module.exports = fp(async function (app) {
  const { sql, db } = app.platformatic

  const categoriesCount = app.env.PLT_SCALER_WINDOW_CATEGORIES
  const minPods = app.env.PLT_SCALER_WINDOW_MIN_PODS
  const minFraction = app.env.PLT_SCALER_WINDOW_MIN_FRACTION

  // The guarded category CASE over the thresholds, for a given pod-count column, so both the
  // history (time_window_stats.pods) and the forecast (time_window_predictions.predicted_pods)
  // are colored on the exact same bands. Guarded so only rows that actually change are rewritten.
  const categoryCase = (thresholds, column) => sql`(CASE ${sql.join(
    thresholds.map((t, i) => sql`WHEN ${sql.ident(column)} < ${t}::numeric THEN ${i + 1}`), sql` `
  )} ELSE ${categoriesCount} END)::smallint`

  app.decorate('updateWindowCategories', async (applicationId) => {
    const scope = sql`application_id = ${applicationId} AND slot_start >= now() - interval '1 year'`

    const statsRes = await db.query(sql`
      SELECT percentile_cont(0.5)  WITHIN GROUP (ORDER BY pods) AS median,
             percentile_cont(0.05) WITHIN GROUP (ORDER BY pods) AS p5,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY pods) AS p95
      FROM time_window_stats WHERE ${scope}
    `)
    const stats = (statsRes.rows || statsRes || [])[0]
    if (!stats || stats.median === null) return null // no windows in scope

    const thresholds = categoryThresholds(
      {
        median: Number(stats.median),
        p5: Number(stats.p5),
        p95: Number(stats.p95)
      },
      { categoriesCount, minPods, minFraction }
    )

    const statsCategory = categoryCase(thresholds, 'pods')
    await db.query(sql`
      UPDATE time_window_stats
      SET category = ${statsCategory}
      WHERE ${scope} AND category IS DISTINCT FROM ${statsCategory}
    `)

    // Color the forecast on the same history-derived bands. Predictions are future rows for this
    // app; the same thresholds apply, so a forecast of N pods gets the same category a historical
    // window of N pods would.
    const predictionCategory = categoryCase(thresholds, 'predicted_pods')
    await db.query(sql`
      UPDATE time_window_predictions
      SET category = ${predictionCategory}
      WHERE application_id = ${applicationId} AND category IS DISTINCT FROM ${predictionCategory}
    `)

    // Persist the fresh thresholds on the app's pattern-config blob so the UI can render the
    // load-view legend without re-deriving them. categoriesCount is emitted alongside the values
    // so consumers don't have to infer band count from `values.length + 1`.
    await app.updatePatternConfig(applicationId, {
      categoryThresholds: {
        values: thresholds,
        categoriesCount,
        updatedAt: new Date().toISOString()
      }
    })

    return thresholds
  })
}, {
  name: 'window-category',
  dependencies: ['env', 'pattern-config']
})
