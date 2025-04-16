CREATE TYPE job_status AS ENUM ('success', 'failed');
ALTER TABLE jobs
ADD COLUMN status job_status,
ADD COLUMN last_run_at TIMESTAMP,
ADD COLUMN next_run_at TIMESTAMP;
