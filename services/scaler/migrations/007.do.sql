-- Add application_id column to flamegraphs table
ALTER TABLE flamegraphs ADD COLUMN application_id uuid;

-- Copy application_id from related alerts
UPDATE flamegraphs
SET application_id = alerts.application_id
FROM alerts
WHERE flamegraphs.alert_id = alerts.id;

-- Remove flamegraphs without a related alert (they have no application_id)
DELETE FROM flamegraphs WHERE application_id IS NULL;

-- Make application_id NOT NULL
ALTER TABLE flamegraphs ALTER COLUMN application_id SET NOT NULL;

-- Add index for efficient querying by application_id
CREATE INDEX idx_flamegraphs_application_id ON flamegraphs(application_id);
