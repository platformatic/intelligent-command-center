-- Rollback: Restore flamegraphs.alert_id and remove alerts.flamegraph_id

-- Step 1: Restore alert_id column to flamegraphs table (nullable, as it was after migration 004)
ALTER TABLE flamegraphs ADD COLUMN alert_id uuid REFERENCES alerts(id);
CREATE INDEX idx_flamegraphs_alert_id ON flamegraphs(alert_id);

-- Step 2: Migrate data back - link flamegraphs to their alerts
UPDATE flamegraphs f
SET alert_id = (
  SELECT a.id FROM alerts a
  WHERE a.flamegraph_id = f.id
);

-- Step 3: Drop the flamegraph_id column from alerts table
DROP INDEX IF EXISTS idx_alerts_flamegraph_id;
ALTER TABLE alerts DROP COLUMN flamegraph_id;
