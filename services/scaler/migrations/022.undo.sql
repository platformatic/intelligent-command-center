-- Reverse to the 015-021 design: accepted-only suggestions, random primary keys.
TRUNCATE scheduled_slots, suggestions;

DROP INDEX IF EXISTS idx_suggestions_identity;
DROP INDEX IF EXISTS suggestions_one_active;
DROP INDEX IF EXISTS suggestions_one_candidate;
CREATE UNIQUE INDEX suggestions_active_identity
  ON suggestions (application_id, slot_of_day, scope_keys)
  WHERE status = 'active';

ALTER TABLE suggestions DROP CONSTRAINT suggestions_status;
ALTER TABLE suggestions ADD  CONSTRAINT suggestions_status
  CHECK (status IN ('active', 'cancelled', 'expired'));

ALTER TABLE suggestions ALTER COLUMN accepted_at SET NOT NULL;
ALTER TABLE suggestions ALTER COLUMN accepted_at SET DEFAULT now();
ALTER TABLE suggestions ALTER COLUMN status      SET DEFAULT 'active';
ALTER TABLE suggestions DROP COLUMN distribution;
ALTER TABLE suggestions DROP COLUMN identity;

ALTER TABLE scheduled_slots         ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE time_window_predictions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE time_window_stats       ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE time_slot_stats         ALTER COLUMN id SET DEFAULT gen_random_uuid();
