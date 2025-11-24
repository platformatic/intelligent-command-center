-- Add flamegraph_id column to alerts table (nullable)
ALTER TABLE alerts ADD COLUMN flamegraph_id uuid REFERENCES flamegraphs(id) ON DELETE SET NULL;
CREATE INDEX idx_alerts_flamegraph_id ON alerts(flamegraph_id);

-- Migrate existing data - link the first flamegraph (by created_at) to each alert
UPDATE alerts a
SET flamegraph_id = (
  SELECT f.id FROM flamegraphs f
  WHERE f.alert_id = a.id
  ORDER BY f.created_at ASC
  LIMIT 1
);

-- Drop the old relationship from flamegraphs table
DROP INDEX IF EXISTS idx_flamegraphs_alert_id;
ALTER TABLE flamegraphs DROP COLUMN alert_id;
