-- application_pattern_configs: per-app JSON blob for the pattern predictor. Holds user-set
-- inputs (timeSlotMinutes) alongside derived outputs (categoryThresholds) so the UI can render
-- both from one fetch. The blob is free-form (JSONB) — new keys are added without a schema
-- change; the app owns its row, upserted lazily on first write.
CREATE TABLE application_pattern_configs (
  application_id UUID PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
