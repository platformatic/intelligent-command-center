
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


