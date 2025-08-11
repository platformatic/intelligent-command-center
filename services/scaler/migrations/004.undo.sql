-- Drop indexes first
DROP INDEX IF EXISTS idx_flamegraphs_service_id;
DROP INDEX IF EXISTS idx_flamegraphs_pod_id;

-- Remove the new columns
ALTER TABLE flamegraphs DROP COLUMN service_id;
ALTER TABLE flamegraphs DROP COLUMN pod_id;

-- Make alert_id NOT NULL again
ALTER TABLE flamegraphs ALTER COLUMN alert_id SET NOT NULL;