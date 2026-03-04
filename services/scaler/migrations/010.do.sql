ALTER TABLE scale_events ADD COLUMN trigger_service VARCHAR(255);
ALTER TABLE scale_events ADD COLUMN trigger_metric VARCHAR(10);

CREATE TABLE metric_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_event_id uuid NOT NULL REFERENCES scale_events(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(10) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metric_snapshots_scale_event_id ON metric_snapshots(scale_event_id);
CREATE INDEX idx_metric_snapshots_application_id ON metric_snapshots(application_id);
