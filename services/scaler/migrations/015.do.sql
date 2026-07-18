CREATE TABLE time_slot_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  slot_of_day INTEGER NOT NULL,
  local_slot_of_day INTEGER NOT NULL,
  min_pods INTEGER NOT NULL,
  max_pods INTEGER NOT NULL,
  p50_pods INTEGER NOT NULL,
  p75_pods INTEGER NOT NULL,
  p90_pods INTEGER NOT NULL,
  p95_pods INTEGER NOT NULL,
  p99_pods INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_slot_stats_app_slot_unique UNIQUE (application_id, slot_start)
);

CREATE INDEX idx_time_slot_stats_app_slot ON time_slot_stats(application_id, slot_start);
CREATE INDEX idx_time_slot_stats_app_slot_uday ON time_slot_stats(application_id, slot_of_day);
CREATE INDEX idx_time_slot_stats_app_slot_lday ON time_slot_stats(application_id, local_slot_of_day);
