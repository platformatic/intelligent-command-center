-- Make alert_id nullable to allow flamegraphs without alerts
ALTER TABLE flamegraphs ALTER COLUMN alert_id DROP NOT NULL;

-- Add service_id and pod_id to flamegraphs table
ALTER TABLE flamegraphs ADD COLUMN service_id VARCHAR(255);
ALTER TABLE flamegraphs ADD COLUMN pod_id VARCHAR(255);

-- Add indexes for the new columns
CREATE INDEX idx_flamegraphs_service_id ON flamegraphs(service_id);
CREATE INDEX idx_flamegraphs_pod_id ON flamegraphs(pod_id);
CREATE INDEX idx_flamegraphs_alert_id ON flamegraphs(alert_id);

