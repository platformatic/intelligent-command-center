CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE deployment_status AS ENUM ('starting', 'started', 'failed');

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detected_pods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  -- TODO: think about removing a deployment_id from here
  deployment_id uuid REFERENCES deployments(id),
  pod_id VARCHAR(255) NOT NULL,
  status deployment_status NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT detected_pods_unique UNIQUE (deployment_id, pod_id)
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
