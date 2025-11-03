CREATE TABLE signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  pod_id VARCHAR(255) NOT NULL,
  scale_event_id uuid REFERENCES scale_events(id) ON DELETE SET NULL,
  type VARCHAR(255) NOT NULL,
  value JSONB,
  timestamp BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signals_alert_id ON signals(alert_id);
CREATE INDEX idx_signals_application_id ON signals(application_id);
CREATE INDEX idx_signals_scale_event_id ON signals(scale_event_id);
CREATE INDEX idx_signals_timestamp ON signals(timestamp);
CREATE INDEX idx_signals_pod_id ON signals(pod_id);
