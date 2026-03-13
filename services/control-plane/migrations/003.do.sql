ALTER TYPE deployment_status ADD VALUE 'stopped';

CREATE TYPE version_status AS ENUM ('active', 'draining', 'expired');

CREATE TABLE version_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  deployment_id uuid NOT NULL REFERENCES deployments(id),
  app_label VARCHAR(255) NOT NULL,
  version_label VARCHAR(255) NOT NULL,
  k8s_deployment_name VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  service_port INTEGER NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  path_prefix VARCHAR(255) NOT NULL DEFAULT '/',
  hostname VARCHAR(255),
  status version_status NOT NULL DEFAULT 'active',
  expire_policy VARCHAR(50) NOT NULL DEFAULT 'http-traffic',
  drained_at TIMESTAMP,
  expired_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT version_registry_unique UNIQUE (app_label, version_label)
);

CREATE INDEX idx_version_registry_app_label ON version_registry(app_label);
CREATE INDEX idx_version_registry_status ON version_registry(app_label, status);

CREATE TABLE skew_protection_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) UNIQUE,
  http_grace_period_ms INTEGER,
  http_max_alive_ms INTEGER,
  workflow_grace_period_ms INTEGER,
  workflow_max_alive_ms INTEGER,
  max_age_s INTEGER,
  max_versions INTEGER,
  cookie_name VARCHAR(255),
  auto_cleanup BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
