CREATE TABLE alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  pod_id VARCHAR(255) NOT NULL,
  elu REAL NOT NULL,
  heap_used REAL NOT NULL,
  heap_total REAL NOT NULL,
  unhealthy BOOLEAN NOT NULL,
  health_history JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flamegraphs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES alerts(id),
  flamegraph BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_application_id ON alerts(application_id);
CREATE INDEX idx_alerts_service_id ON alerts(service_id);
CREATE INDEX idx_alerts_pod_id ON alerts(pod_id);

