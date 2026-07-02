-- Recreate the performance_history table (mirrors migration 001).
CREATE TABLE performance_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  pods_added INTEGER NOT NULL,
  total_pods INTEGER NOT NULL,
  pre_elu_mean REAL NOT NULL,
  pre_heap_mean REAL NOT NULL,
  pre_elu_trend REAL NOT NULL,
  pre_heap_trend REAL NOT NULL,
  delta_elu REAL NOT NULL,
  delta_heap REAL NOT NULL,
  sigma_elu REAL NOT NULL,
  sigma_heap REAL NOT NULL,
  success_score REAL NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'signal' CHECK (source IN ('signal', 'prediction')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, event_timestamp)
);

CREATE INDEX idx_performance_history_application_id ON performance_history(application_id);
CREATE INDEX idx_performance_history_event_timestamp ON performance_history(event_timestamp);
CREATE INDEX idx_performance_history_created_at ON performance_history(created_at);
