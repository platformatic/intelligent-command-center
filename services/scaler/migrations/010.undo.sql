DROP TABLE IF EXISTS metric_snapshots;

ALTER TABLE scale_events DROP COLUMN IF EXISTS trigger_service;
ALTER TABLE scale_events DROP COLUMN IF EXISTS trigger_metric;
