CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE deployment_status AS ENUM ('starting', 'started', 'failed');
CREATE TYPE instance_status AS ENUM ('starting', 'running', 'stopped');

CREATE TABLE generations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE graphs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id uuid NOT NULL REFERENCES generations(id) UNIQUE,
  graph JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  version INTEGER NOT NULL,
  resources JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT applications_configs_unique UNIQUE (application_id, version)
);

CREATE TABLE application_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  plt_version VARCHAR(255) NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  application_state_id uuid REFERENCES application_states(id),
  status deployment_status NOT NULL,
  image_id VARCHAR(255) NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE instances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  deployment_id uuid REFERENCES deployments(id),
  pod_id VARCHAR(255) NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  status instance_status NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT instances_unique UNIQUE (deployment_id, pod_id)
);

CREATE TABLE valkey_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  username VARCHAR(255) NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generations_deployments (
  generation_id uuid NOT NULL REFERENCES generations(id),
  deployment_id uuid NOT NULL REFERENCES deployments(id),
  PRIMARY KEY (generation_id, deployment_id)
);

CREATE TABLE generations_applications_configs (
  generation_id uuid NOT NULL REFERENCES generations(id),
  config_id uuid NOT NULL REFERENCES applications_configs(id),
  PRIMARY KEY (generation_id, config_id)
);
