# Floor Suggestions — behavioral spec

How the pattern-predictor turns per-slot forecasts into **reviewable floor suggestions** a user can
apply, and how applied suggestions resolve into an actual pod floor per day.

This is the agreed *behavior*. It is **not** all implemented yet — see [Status](#status).

---

## 1. Effects vs. suggestions

The predictor decomposes each time-of-day slot into:

- a **baseline** — the always-on resting level for that slot, and
- zero or more **effects** — calendar deltas on top of the baseline (`dow`, `dom`, `eom`,
  `biweekly_dow`, `p14`). Each effect is a *delta* (e.g. `Friday +5`), never an absolute.

**Effects are not suggestions.** A **suggestion is a *combination* of effects** — the set of effects
that co-fire together, with an **absolute value**:

```
value = baseline + Σ(effects in the combination)
```

Example — one slot with `baseline 10`, `Friday +5`, `every-other-Friday +5 more`, `3rd-of-month +2`:

| # | combination            | fires on                     | value |
|---|------------------------|------------------------------|-------|
| 1 | `{}`                   | a plain day (e.g. Tuesday)   | 10    |
| 2 | `{Friday}`             | a regular Friday             | 15    |
| 3 | `{Friday, biweekly}`   | an every-other-Friday        | 20    |
| 4 | `{3rd}`                | the 3rd, not a Friday        | 12    |
| 5 | `{Friday, 3rd}`        | a regular Friday-the-3rd     | 17    |
| 6 | `{Friday, biweekly, 3rd}` | a biweekly Friday-the-3rd | 22    |

`{Friday}` and `{3rd}` are **not** two suggestions that collide — the collision day
(Friday-the-3rd) is **its own** suggestion (`{Friday, 3rd}`).

The baseline itself is a suggestion — the `{}` combination.

## 2. Which combinations become suggestions

**Every combination that occurs at least once in the horizon** — even a single occurrence. A
3-effect intersection that lands once in the next 60 days is still surfaced. No frequency/confidence
cutoff.

A combination is surfaced from the **exact** effect-set observed on a day: `{Friday}` exists only if
some Friday has *no* other effect; `{Friday, biweekly}` exists only if some every-other-Friday
occurs. But a suggestion's **apply-scope and history** use the intersection **superset** — see §4.

## 3. Suggestion contents

Each suggestion carries:

- **`when`** — human recurrence + time window (e.g. "Every Friday, 5–6 PM").
- **`value`** — the absolute floor = `baseline + Σ included effects`.
- **`baseline`** — the resting level.
- **`effects`** — **every** effect this suggestion references (declared once, with a stable **`id`**):
  its combination (`included: true`) **plus** any co-firing extra that shows up in its history
  (`included: false`). Each `{ id, when, delta, confidence, included }`. The `id` is the effect's
  scope key (e.g. `dow|5`), stable across the suggestions of a slot.
- **`confidence`** — `min` over the *included* effects. The baseline (`{}`) has `confidence: 1` —
  the resting level is the always-on default, taken as certain.
- **`history`** — past occurrences (see §4). Each row `{ id, date, value, baseline, effects:[{ id,
  delta }] }`: `id` is the DB row uuid, and each `effects[]` entry **references a top-level effect by
  `id`** (no repeated `when`) with that day's fitted `delta`. `value = baseline + Σ delta`;
  `included` is looked up from the top-level `effects`.
- **`predictions`** — forecast over the horizon, but each row is **just `{ id }`** (the DB uuid). A
  future forecast is flat, so a per-row decomposition would only repeat the suggestion header.

The baseline suggestion's `history` is capped at the last **14 days** (it fires daily, so the full
history would dwarf everything); effect/combination suggestions are naturally sparse (their
occurrences only). Prediction rows are only emitted for days that actually have a persisted
`time_window_predictions` row, so their `id` is always a real DB uuid.

## 4. Exact-set vs. superset (the subtle bit)

- **Existence** of a suggestion comes from the *exact* effect-set on a day (§2).
- **Apply-scope** and **history** of a suggestion use the *intersection superset* — every day where
  **all** of the combination's effects fire, even if *more* effects also fire there.

So the `{Friday}` suggestion:
- exists because some Friday is Friday-only,
- but its history lists **all** Fridays (including biweekly ones and Friday-the-3rds), and applying
  it sets a floor on **all** Fridays.
- On those richer days, the history row **references the extra effect's `id`** as well; that effect
  is declared in the suggestion's top-level `effects` with **`included: false`** — it contributed to
  that day's real value but is not part of *this* suggestion, and points the reviewer at the
  more-specific suggestion.

## 5. Apply

Applying a suggestion:

- creates a **durable recurring rule** for the combination's intersection scope,
- sets its **absolute value** on every day the combination fires (the superset),
- with an **optional limit** (until-date) chosen at apply time; no limit → recurs forever.

The horizon (60 days) is only what we *display*; the applied rule is durable (or until the limit).

`value` is applied as-is (editing on apply is out of scope for now).

## 6. Resolution — the floor on a given day

A day may be covered by several applied rules. The floor is:

1. **Most-specific wins** — the applied suggestion with the **most effects** (narrowest day-set).
   It wins **even if its value is lower** (the whole point of a more-specific suggestion is to say
   "these days are different", up or down).
2. **Equal-specificity ties → max value** (siblings like `{Friday}` vs `{3rd}` on a Friday-the-3rd
   when `{Friday,3rd}` isn't applied → the higher of 15 / 12).
3. **No applicable applied rule → unset.**

This is exactly the existing **priority-tier resolver** (`lib/scheduler/default-resolver.js`) with
**priority = effect count**.

### Worked scenarios (from the spec discussion)

Suggestions: `#1 {} =10`, `#2 {Friday} =15`, `#3 {Friday,biweekly} =20`, `#4 {3rd} =12`,
`#5 {Friday,3rd} =17`.

- **Apply `[#2]` only:** regular Friday → 15; every-other-Friday → **15** (#3 not applied, falls
  through to #2); Friday-the-3rd → **15**; Tuesday → **unset**.
- **Apply `[#1,#2]`:** every-other-Friday → **15** (#2 beats baseline; #3 not applied).
- **Apply `[#1,#2,#3]`:** every-other-Friday → **20** (#3 most specific); regular Friday → 15;
  Tuesday → 10.
- **Apply `[#2,#4]`, not `#5`:** a Friday-the-3rd → **max(15,12) = 15** (equal-specificity tie).

## 7. Cancel

Cancelling pops that rule from the stack; the day falls back to the **next-most-specific applied**
rule, or unset if none.

- Applied `#1,#2,#3`, a biweekly-Friday reads 20. Cancel `#3` → **15** (from `#2`). Cancel `#2` too
  → **10** (from `#1`). Cancel all → unset.

## 8. Drift

An applied rule **holds its value forever** — it **never auto-updates**. If the model later relearns
a different value (e.g. Fridays are now 18, not the applied 15), that surfaces **later as a new
suggestion** showing the diff between what's applied and what's now predicted. Exact UX TBD.

---

## Status

- **Implemented (this branch):** **combination** suggestions — one per *realized combination* of
  co-firing effects (`{}` = baseline), enumerated from the EXACT effect-set on each observed/horizon
  day, with `value = baseline + Σ(combination effects)`, `confidence = min` of the included effects
  (baseline → `null`), and inline `history`/`predictions` over the intersection **superset** (every
  day where all the combination's effects fire), each row decomposed into `{ id, date, value,
  baseline, effects:[{ when, delta, included }] }` — co-firing extras appear `included:false`. The
  baseline's history is capped at the last 14 days. Served at
  `GET /scaler/applications/:id/suggestions` as `{ suggestions, computedAt }`. Strictly per-slot,
  bounded reads (≤ `HISTORY_DAYS` past + horizon per slot, explicit `LIMIT`). Dedup/grouping removed.
- **Accept / cancel (this branch):** migration `021` adds `suggestions` (accepted, status-tracked,
  frozen `value`+`details`, content identity `(application_id, slot_of_day, scope_keys)`) and
  `scheduled_slots` (resolved horizon, UI). `plugins/suggestions.js` owns accept (idempotent upsert
  on identity), cancel (status→cancelled + rebuild), expiry (`until` → status expired), and the
  materialiser (`rebuildScheduledSlots`). `routes/suggestions.js`: `POST …/suggestions/accept`,
  `POST …/suggestions/:id/cancel`, `GET …/suggestions/accepted`, `GET …/scheduled`.
- **Resolution (this branch):** `lib/scheduler/suggestion-resolver.js` — **firing-day-set inclusion**
  partial order (not effect count): most-specific (subset) wins even if lower; incomparable siblings →
  max. Subset via scope implication (`biweekly_dow ⟹ dow`). Enforcement: the scheduler tick resolves
  the live "now" floor and merges with manual schedules — **manual wins**; suggestion-only apps are
  covered; horizon rolled + expiry flipped once per UTC day.
- **Known gaps:** `biweekly_dow`/`p14` phase uses a fixed anchor in the resolver (may misalign with the
  predictor's anchor — follow-up); accept input validation is minimal; custom (sub-slot) user
  schedules remain the future second source the resolver will merge.

## Open questions

- Drift UX — how the "applied vs. newly-predicted" diff is presented.
- Whether a combination's history should cap like the baseline's 14-day window at scale.
