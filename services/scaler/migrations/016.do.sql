CREATE TABLE time_window_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  slot_of_day INTEGER NOT NULL,
  local_slot_of_day INTEGER NOT NULL,
  pods INTEGER NOT NULL,
  category SMALLINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_window_stats_app_slot_unique UNIQUE (application_id, slot_start)
);

CREATE INDEX idx_time_window_stats_app_slot ON time_window_stats(application_id, slot_start);
CREATE INDEX idx_time_window_stats_app_slot_uday ON time_window_stats(application_id, slot_of_day);
CREATE INDEX idx_time_window_stats_app_slot_lday ON time_window_stats(application_id, local_slot_of_day);
