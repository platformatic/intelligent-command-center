DROP INDEX IF EXISTS idx_flamegraphs_application_id;
ALTER TABLE flamegraphs DROP COLUMN IF EXISTS application_id;
