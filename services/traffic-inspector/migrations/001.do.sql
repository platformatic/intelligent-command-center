CREATE TYPE recommendation_status AS ENUM ('old', 'new', 'in_progress', 'skipped', 'aborted', 'done', 'expired', 'calculating');

CREATE TABLE recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  status recommendation_status NOT NULL DEFAULT 'new',
  count SERIAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interceptor_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid NOT NULL REFERENCES recommendations(id),
  application_id uuid NOT NULL,
  config JSONB NOT NULL,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE route_examples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  telemetry_id varchar(255) NOT NULL,
  route varchar(255) NOT NULL,
  request JSONB NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_request UNIQUE (application_id, telemetry_id, route)
);

CREATE TABLE recommendations_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid NOT NULL REFERENCES recommendations(id),
  application_id uuid NOT NULL,
  telemetry_id varchar(255) NOT NULL,
  service_name varchar(255) NOT NULL,
  route varchar(255) NOT NULL,
  recommended BOOLEAN NOT NULL,
  applied BOOLEAN DEFAULT FALSE,
  cache_tag varchar(255),
  ttl INTEGER NOT NULL,
  score FLOAT NOT NULL,
  hits INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  memory INTEGER NOT NULL,
  vary_headers JSONB,
  scores JSONB NOT NULL,
  domain varchar(255) NOT NULL,
  selected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

