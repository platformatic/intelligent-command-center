CREATE TABLE time_window_predictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  slot_of_day INTEGER NOT NULL,
  percentile TEXT NOT NULL,
  predicted_pods INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_window_predictions_app_slot_unique UNIQUE (application_id, slot_start)
);

CREATE INDEX idx_time_window_predictions_app_slot ON time_window_predictions(application_id, slot_start);
CREATE INDEX idx_time_window_predictions_app_sday ON time_window_predictions(application_id, slot_of_day);
