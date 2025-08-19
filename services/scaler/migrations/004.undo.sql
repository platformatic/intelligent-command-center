-- Revert flamegraphs table changes
DROP INDEX IF EXISTS idx_flamegraphs_alert_id;
DROP INDEX IF EXISTS idx_flamegraphs_pod_id;
DROP INDEX IF EXISTS idx_flamegraphs_service_id;

ALTER TABLE flamegraphs
DROP COLUMN IF EXISTS pod_id,
DROP COLUMN IF EXISTS service_id,
ALTER COLUMN alert_id SET NOT NULL;
