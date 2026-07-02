# CLAUDE.md — scaler service

Makes autoscaling decisions for ICC-managed apps and actuates them via the **machinist** service
(`app.machinist.updateController`). Platformatic **DB** service: each table → auto REST/GraphQL
entity; `migrations/` auto-apply on boot; `entity.save({ input })` returns the row object.
`plugins/` (wiring) + `routes/` (HTTP) are auto-loaded; `lib/` holds pure logic.

## Two algorithms — switch via `PLT_SCALER_ALGORITHM_VERSION` (`v1` default | `v2`)
- **v1 reactive** (ELU/HEAP thresholds): `lib/reactive-scaling-algorithm.js`,
  `plugins/scaler-executor.js`. Pods push health via `POST /alerts`; driven by a leader-gated periodic
  metric check + alert `NOTIFY`s.
- **v2 signal / load-predictor** (Holt double-exponential forecast over per-pod ELU/heap signals):
  `lib/load-predictor/`, `plugins/signal-scaler-executor.js`. Pods stream `POST /signals` and the
  lifecycle `POST /connect|/ready|/disconnect`. ~50 `PLT_SIGNALS_SCALER_*` tuning knobs; read-only
  dashboard API under `/api/v2/...`. (Not in OSS — throws if `lib/load-predictor` can't be required.)
- Most plugins/routes **early-return on the wrong version** — check the version guard before editing.

## Leader election gates all periodic work
`plugins/leader.js` (Postgres advisory lock) → on leadership runs `startPeriodicServices`: v1 trigger,
k8s-sync, scheduler. Non-leaders ingest and forward via Postgres `NOTIFY` (`trigger_scaler`,
`trigger_signal_scaler`). Anything time-driven hangs off this.

## Pod limits: hard ∩ soft → effective
- **Hard** = `application_scale_configs` (set by K8s labels via k8s-sync, or `POST /scale-configs`).
- **Soft** = the **scheduler** (`plugins/scheduler.js`, `lib/scheduler/`): time-windowed limits from
  iCalendar **RRULE** schedules (`scaler_schedules` table), evaluated by a leader-gated, minute-aligned
  tick, stored in Valkey `scaler:soft-limits:<app>` (TTL self-heals).
- Algorithms read **`app.getScalingLimits(appId)`** (merges hard ∩ soft) — never raw `getScaleConfig`.

## State
- **Postgres**: `controllers` (the scalable unit; provider-agnostic via `provider_metadata`),
  `scale_events`, `alerts`, `flamegraphs`, `signals`, `application_scale_configs`, `metric_snapshots`,
  `count_snapshots`, `scaler_schedules`.
- **Valkey** (`scaler:` prefix; SCAN + `{hash-tags}` for ElastiCache cluster mode): v1
  alerts/clusters/cooldowns, v2 algorithm state, soft limits, and mqemitter pub/sub for dashboard updates.

## Conventions
- `lib/` = pure, isolation-testable logic (no `app`/entities/DB). `plugins/` = wiring (entities, store,
  log) exposed via `app.decorate(...)`, bodies inlined. **One plugin owns a subsystem's instance;**
  other code uses its decorators, never the class. No thin passthrough methods. Parallelize independent
  awaits (`Promise.all`). Throw via `lib/errors.js` (`@fastify/error createError`), not bare `Error`.

## Testing
- Needs real Postgres `:5433` + Valkey `:6343`: `docker-compose -f ../../docker-compose.yml --env-file /dev/null up -d`.
- **Always `borp --concurrency 1`** (the `test` script does this) — the mock machinist (`:3052`) and
  Prometheus bind **fixed ports**, so parallel runs fail with `EADDRINUSE`.
- Single file: `DOTENV_CONFIG_QUIET=true npx borp --timeout=60000 <file>`.
- A `buildServer` that **rejects mid-init leaks DB/Valkey handles → the borp worker never exits and the
  whole run hangs**. Don't assert "boot throws" through `buildServer`; unit-test the validator instead.
- `test/helper.js`: `buildServer` loads all plugins+routes; `buildServerWithPlugins(t, opts, plugins)`
  loads only the listed plugins (respect each plugin's `dependencies`). `setUpEnvironment` does
  `Object.assign(process.env, …)` — a var set in one test leaks to later tests in the same file; reset
  with `t.after`.
- `machinist.test.js` is slow by design (~39s per network-error retry test). `SKIP_POST_SCALING_EVALUATION=true`
  skips v1's 300s post-scaling timer. Lint = `standard` (`npx standard --fix`; multiline object literals
  need one property per line).

## In-repo docs (mind the staleness)
- `ALGORITHMS.MD` — v1 reactive only (the trends-learning predictor was removed; ignore stray references).
- `SIGNAL_SCALER_ALGORITHM.md` — **stale/inaccurate**: describes a non-existent rate-counting algorithm
  and `lib/multi-signal-reactive-algorithm.js`. The real v2 is the Holt forecaster in `lib/load-predictor/`.
- `docs/superpowers/specs|plans/2026-06-24-scaler-scheduler-*` — scheduler design + implementation plan.
