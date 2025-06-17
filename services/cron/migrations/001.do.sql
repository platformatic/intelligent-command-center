
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
        CREATE TYPE job_type_enum AS ENUM ('ICC','WATT', 'USER');
    END IF;
END $$;

/* create a jobs table */
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(255),
  callback_url VARCHAR(2048) NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  body TEXT,
  headers JSON,
  max_retries INTEGER NOT NULL DEFAULT 5,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  protected BOOLEAN NOT NULL DEFAULT FALSE, /* cannot be deleted */
  application_id UUID,
  status VARCHAR(255) DEFAULT 'success', /* success, failed */
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  job_type job_type_enum NOT NULL DEFAULT 'USER' 
);

/* creates a messages table */
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  "when" TIMESTAMP DEFAULT NOW(),
  failed BOOLEAN DEFAULT FALSE,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  body TEXT,
  headers JSON,
  sent_at TIMESTAMP,
  retries INTEGER DEFAULT 0,
  response_body TEXT,
  response_status_code TEXT,
  no_reschedule BOOLEAN DEFAULT FALSE, /* if true, the message will not be rescheduled */
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP,
  response_headers TEXT,
  callback_url VARCHAR(2048)
);

/* Performance indexes for common query patterns */

/* Critical index for the main executor query that fetches pending messages */
CREATE INDEX idx_messages_executor ON messages(sent_at, failed, "when", deleted_at) 
WHERE sent_at IS NULL AND failed = false AND deleted_at IS NULL;

/* Index for timer updates to find the next message to process */
CREATE INDEX idx_messages_timer ON messages("when") 
WHERE sent_at IS NULL AND deleted_at IS NULL;

/* Index for job-specific message lookups */
CREATE INDEX idx_messages_job_pending ON messages(job_id, sent_at) 
WHERE sent_at IS NULL;

/* Composite index for job lookups by name, type, and application */
CREATE INDEX idx_jobs_name_type_app ON jobs(name, job_type, application_id) 
WHERE deleted_at IS NULL;

/* Index for soft delete queries on jobs */
CREATE INDEX idx_jobs_deleted ON jobs(deleted_at) 
WHERE deleted_at IS NULL;

/* Foreign key index for messages.job_id if not automatically created */
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);


