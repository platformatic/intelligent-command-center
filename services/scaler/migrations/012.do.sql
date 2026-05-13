CREATE TABLE count_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_event_id uuid NOT NULL REFERENCES scale_events(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (scale_event_id)
);

CREATE INDEX idx_count_snapshots_application_id ON count_snapshots(application_id);
