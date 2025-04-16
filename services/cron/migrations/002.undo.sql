ALTER TABLE jobs
DROP COLUMN status,
DROP COLUMN last_run_at,
DROP COLUMN next_run_at;
DROP TYPE job_status;
