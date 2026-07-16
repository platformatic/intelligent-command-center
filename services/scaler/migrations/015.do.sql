-- The pattern-predictive scaler, in one migration.
--
-- Ingest → history → forecast → suggestions → schedule:
--   time_slot_stats            base slots (every percentile), the raw ingest
--   time_window_stats          the per-window series the predictor actually models
--   time_window_predictions    the frozen forecast, one row per future window
--   application_pattern_configs per-app predictor tuning
--   suggestions                floor suggestions — candidates AND accepted, one table
--   scheduled_slots            the resolved floor per slot (derived cache, UI)
--
-- DERIVED IDS. Every time-window row is already UNIQUE (application_id, slot_start), so its primary
-- key is a uuidv5 of that natural key rather than a random uuid:
--
--     id = uuidv5(NAMESPACE, '<table>|<application_id>|<slotStartMs>')     -- see lib/ids.js
--
-- That makes any slot's id COMPUTABLE from (table, app, slotStart) anywhere in the system. It is what
-- lets a suggestion's calendar occurrences be *generated* instead of queried — and it keeps them
-- correct for an accepted suggestion, whose stored id list would otherwise freeze at accept time and
-- be entirely in the past a month later. The app layer supplies the id, so there is no DB default.
-- `<table>` namespaces the hash so a stats row and a prediction row for the SAME slot never collide.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- ingest

CREATE TABLE time_slot_stats (
  id                uuid PRIMARY KEY,              -- derived: 'slot|<app>|<slotStartMs>'
  application_id    uuid NOT NULL,
  slot_start        TIMESTAMPTZ NOT NULL,
  slot_end          TIMESTAMPTZ NOT NULL,
  slot_of_day       INTEGER NOT NULL,
  local_slot_of_day INTEGER NOT NULL,
  min_pods          INTEGER NOT NULL,
  max_pods          INTEGER NOT NULL,
  p50_pods          INTEGER NOT NULL,
  p75_pods          INTEGER NOT NULL,
  p90_pods          INTEGER NOT NULL,
  p95_pods          INTEGER NOT NULL,
  p99_pods          INTEGER NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_slot_stats_app_slot_unique UNIQUE (application_id, slot_start)
);
CREATE INDEX idx_time_slot_stats_app_slot      ON time_slot_stats(application_id, slot_start);
CREATE INDEX idx_time_slot_stats_app_slot_uday ON time_slot_stats(application_id, slot_of_day);
CREATE INDEX idx_time_slot_stats_app_slot_lday ON time_slot_stats(application_id, local_slot_of_day);

-- ---------------------------------------------------------------- history

CREATE TABLE time_window_stats (
  id                uuid PRIMARY KEY,              -- derived: 'stats|<app>|<slotStartMs>'
  application_id    uuid NOT NULL,
  slot_start        TIMESTAMPTZ NOT NULL,
  slot_end          TIMESTAMPTZ NOT NULL,
  slot_of_day       INTEGER NOT NULL,
  local_slot_of_day INTEGER NOT NULL,
  pods              INTEGER NOT NULL,
  category          SMALLINT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_window_stats_app_slot_unique UNIQUE (application_id, slot_start)
);
CREATE INDEX idx_time_window_stats_app_slot      ON time_window_stats(application_id, slot_start);
CREATE INDEX idx_time_window_stats_app_slot_uday ON time_window_stats(application_id, slot_of_day);
CREATE INDEX idx_time_window_stats_app_slot_lday ON time_window_stats(application_id, local_slot_of_day);

-- ---------------------------------------------------------------- forecast

CREATE TABLE time_window_predictions (
  id             uuid PRIMARY KEY,                 -- derived: 'pred|<app>|<slotStartMs>'
  application_id uuid NOT NULL,
  slot_start     TIMESTAMPTZ NOT NULL,
  slot_end       TIMESTAMPTZ NOT NULL,
  slot_of_day    INTEGER NOT NULL,
  percentile     TEXT NOT NULL,
  predicted_pods INTEGER NOT NULL,
  category       SMALLINT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_window_predictions_app_slot_unique UNIQUE (application_id, slot_start)
);
CREATE INDEX idx_time_window_predictions_app_slot ON time_window_predictions(application_id, slot_start);
CREATE INDEX idx_time_window_predictions_app_sday ON time_window_predictions(application_id, slot_of_day);

CREATE TABLE application_pattern_configs (
  application_id uuid PRIMARY KEY,
  config         JSONB NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------- suggestions
--
-- Candidates and accepted suggestions live in ONE table, told apart by `status`.
--
--   identity = uuidv5(NAMESPACE, 'suggestion|<app>|<slotOfDay>|<sortedScopeKeys>')
--
-- `identity` names the PATTERN ("slot 137, every Friday"); `id` names the ROW. A candidate row and an
-- accepted row COEXIST for one identity: accepting COPIES the candidate into a new 'active' row and
-- leaves the candidate in place, where the nightly run keeps refreshing it (that is the drift data;
-- the API hides it while the accepted row lives). Cancelling the accepted row un-hides the candidate,
-- so the pattern is offered again at once rather than after the next nightly run.
--
-- Regeneration is a DELETE+INSERT of `status='suggested'` rows in one transaction, so it never touches
-- an accepted row — that row is a SNAPSHOT frozen at accept time. And if the algorithm stops producing
-- a pattern, the DELETE drops its candidate: cancelling then leaves nothing to re-offer, correctly.

CREATE TABLE suggestions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,  -- the ROW (random: rows churn nightly)
  identity       uuid NOT NULL,                               -- the PATTERN (derived, stable forever)
  application_id uuid NOT NULL,
  slot_of_day    INTEGER NOT NULL,
  scope_keys     TEXT[] NOT NULL,     -- sorted effect keys; '{}' = the baseline. Opaque to the frontend.
  status         TEXT NOT NULL,       -- suggested | active | cancelled | expired
  value          INTEGER NOT NULL,    -- the floor
  details        JSONB NOT NULL,      -- summary:  { when, baseline, confidence, effects[] }
  distribution   JSONB NOT NULL DEFAULT '[]'::jsonb,
                                      -- per-day:  [{ date, baseline, effects:[{ id, delta }] }]
                                      -- needs the model, so it cannot be recomputed cheaply → stored.
                                      -- Bulky: never SELECTed by the list, only by /details.
  until          TIMESTAMPTZ,         -- optional limit; NULL = recurs forever
  accepted_at    TIMESTAMPTZ,         -- NULL while merely suggested
  ended_at       TIMESTAMPTZ,         -- when cancelled / expired
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suggestions_value_ge_1 CHECK (value >= 1),
  CONSTRAINT suggestions_status CHECK (status IN ('suggested', 'active', 'cancelled', 'expired'))
);

-- Uniqueness is per OPEN status, not per identity — an accepted row and its shadow candidate share
-- one identity. cancelled/expired accumulate freely as history, so a pattern you cancelled can be
-- suggested again later.
CREATE UNIQUE INDEX suggestions_one_candidate ON suggestions (identity) WHERE status = 'suggested';
CREATE UNIQUE INDEX suggestions_one_active    ON suggestions (identity) WHERE status = 'active';
CREATE INDEX        idx_suggestions_identity  ON suggestions (identity);
CREATE INDEX        idx_suggestions_app       ON suggestions (application_id);

-- ---------------------------------------------------------------- resolved schedule
--
-- The floor actually in force per slot, after most-specific-wins resolution across every accepted
-- suggestion. A derived cache for the UI, rebuilt on accept/cancel and rolled once a day — the
-- scaler itself resolves live at the tick and never reads this.

CREATE TABLE scheduled_slots (
  id             uuid PRIMARY KEY,                 -- derived: 'sched|<app>|<slotStartMs>'
  application_id uuid NOT NULL,
  slot_start     TIMESTAMPTZ NOT NULL,
  slot_end       TIMESTAMPTZ NOT NULL,
  slot_of_day    INTEGER NOT NULL,
  value          INTEGER NOT NULL,
  suggestion_id  uuid NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT scheduled_slots_slot UNIQUE (application_id, slot_start)
);
CREATE INDEX idx_scheduled_slots_app_slot ON scheduled_slots(application_id, slot_start);
CREATE INDEX idx_scheduled_slots_app_sday ON scheduled_slots(application_id, slot_of_day);
