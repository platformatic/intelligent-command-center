-- Accepted floor suggestions and the resolved per-slot schedule they produce.
-- `suggestions`     — the user's committed decisions (frozen at accept), status-tracked.
-- `scheduled_slots` — derived cache: the resolved floor per concrete horizon slot (rebuilt on
--                     accept/cancel/horizon-roll). UI reads it; enforcement resolves live at the tick.

CREATE TABLE suggestions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  slot_of_day    INTEGER NOT NULL,        -- recurring slot index (native slot identity)
  scope_keys     TEXT[] NOT NULL,         -- sorted included-effect ids; '{}' = baseline. identity + resolver input
  value          INTEGER NOT NULL,        -- floor, frozen at accept
  until          TIMESTAMPTZ,             -- optional limit; NULL = recurs forever
  details        JSONB NOT NULL,          -- display snapshot: { when, baseline, confidence, effects }
  status         TEXT NOT NULL DEFAULT 'active',
  accepted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ,             -- when cancelled/expired
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suggestions_value_ge_1 CHECK (value >= 1),
  CONSTRAINT suggestions_status CHECK (status IN ('active', 'cancelled', 'expired'))
);

-- One ACTIVE suggestion per content identity; cancelled/expired history is unlimited.
CREATE UNIQUE INDEX suggestions_active_identity
  ON suggestions (application_id, slot_of_day, scope_keys)
  WHERE status = 'active';
CREATE INDEX idx_suggestions_app ON suggestions(application_id);

CREATE TABLE scheduled_slots (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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
