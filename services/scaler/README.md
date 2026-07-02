# Scaler Service

The Scaler service is responsible for scaling applications based on metrics and alerts.

## Testing the Scaling Algorithm

The scaling algorithm tests might exceed the default timeout when run as a group. To run them correctly, you can use one of the following approaches:

### Run specific tests

```bash
# Run a specific test pattern using Node's test runner
node --test --test-only "constructor" ./test/lib/scaling-algorithm.test.js

# Or run individual tests with a longer timeout
npx borp -c 1 --timeout=10000 ./test/lib/scaling-algorithm.test.js
```

### Run individual test files

If you encounter timeout issues, run specific portions of the tests:

```bash
# For basic tests
node --test --test-only "calculateTrend|calculateVariability" ./test/lib/scaling-algorithm.test.js

# For metrics processing tests
node --test --test-only "processPodMetrics|getPerformanceSuccessScore" ./test/lib/scaling-algorithm.test.js

# For scaling decision tests
node --test --test-only "calculateScalingDecision" ./test/lib/scaling-algorithm.test.js

# For history and clustering tests
node --test --test-only "addPerfHistoryEvent|updateClusters" ./test/lib/scaling-algorithm.test.js
```

## Seeding demo data

`scripts/seed-time-windows.js` fills one application's time-window history with a realistic load
shape (quiet nights, busy weekday business hours, weekends lower, slow growth, occasional spikes),
then triggers categorization and prediction — all through a single endpoint that resolves the app
by name.

```bash
# one-time: enable the seed endpoint on the `main` service — PLT_SCALER_SEED_API_ENABLED=true
node scripts/seed-time-windows.js --app <application-name>
```

Overrides (env): `ICC_API_URL` (default `https://icc.plt`), `SEED_MONTHS` (3),
`SEED_WINDOW_MINUTES` (60 — must match the scaler's `PLT_SCALER_TIME_WINDOW_MINUTES`),
`ICC_INSECURE_TLS` (default on, skips the local k3d self-signed cert).

The endpoint replaces the app's existing windows and is gated by `PLT_SCALER_SEED_API_ENABLED` —
keep it off outside demo environments.

All individual tests should pass correctly when run with appropriate timeouts.