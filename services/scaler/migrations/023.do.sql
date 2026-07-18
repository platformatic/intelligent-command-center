-- Actual pod count alongside the unclamped scaler target.
--
-- The stats pipeline already records the UNCLAMPED desired pod count (the raw v2 load-predictor
-- output, ignoring limits/cooldowns): time_slot_stats keeps every percentile of it, time_window_stats
-- keeps the single configured percentile as `pods`. We now record a second series in parallel — the
-- ACTUAL number of pods running at decision time — so each row carries both "what we wanted" and
-- "what was running". Columns are nullable: rows written before this migration have no actual value,
-- and new writes always populate them.

ALTER TABLE time_slot_stats
  ADD COLUMN actual_min_pods INTEGER,
  ADD COLUMN actual_max_pods INTEGER,
  ADD COLUMN actual_p50_pods INTEGER,
  ADD COLUMN actual_p75_pods INTEGER,
  ADD COLUMN actual_p90_pods INTEGER,
  ADD COLUMN actual_p95_pods INTEGER,
  ADD COLUMN actual_p99_pods INTEGER;

ALTER TABLE time_window_stats
  ADD COLUMN actual_pods INTEGER;
