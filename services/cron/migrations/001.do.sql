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
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
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
  deleted_at TIMESTAMP
);
