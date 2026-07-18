ALTER TABLE time_window_stats
  DROP COLUMN actual_pods;

ALTER TABLE time_slot_stats
  DROP COLUMN actual_min_pods,
  DROP COLUMN actual_max_pods,
  DROP COLUMN actual_p50_pods,
  DROP COLUMN actual_p75_pods,
  DROP COLUMN actual_p90_pods,
  DROP COLUMN actual_p95_pods,
  DROP COLUMN actual_p99_pods;
