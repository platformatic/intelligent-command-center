CREATE TABLE scaler_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  name VARCHAR(255),
  dtstart TIMESTAMPTZ NOT NULL,
  dtend TIMESTAMPTZ NOT NULL,
  rrule TEXT,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  min_pods INTEGER,
  max_pods INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT scaler_schedules_has_limit CHECK (min_pods IS NOT NULL OR max_pods IS NOT NULL),
  CONSTRAINT scaler_schedules_min_ge_1 CHECK (min_pods IS NULL OR min_pods >= 1),
  CONSTRAINT scaler_schedules_min_le_max CHECK (min_pods IS NULL OR max_pods IS NULL OR min_pods <= max_pods),
  CONSTRAINT scaler_schedules_end_after_start CHECK (dtend > dtstart)
);

CREATE INDEX idx_scaler_schedules_application_id ON scaler_schedules(application_id);
CREATE INDEX idx_scaler_schedules_app_enabled ON scaler_schedules(application_id, enabled);
