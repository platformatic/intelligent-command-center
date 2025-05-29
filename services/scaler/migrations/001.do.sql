
/* 
  TODO: add table to store the normalized data
 */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE application_scale_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  min_pods INTEGER NOT NULL,
  max_pods INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE controllers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  deployment_id uuid NOT NULL,
  namespace VARCHAR(255) NOT NULL,
  k8s_controller_id VARCHAR(255) NOT NULL,
  kind VARCHAR(255) NOT NULL,
  api_version VARCHAR(255) NOT NULL,
  replicas INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (application_id, deployment_id, namespace, k8s_controller_id)
);

CREATE TABLE scale_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
  replicas INTEGER NOT NULL,
  replicas_diff INTEGER NOT NULL,
  reason VARCHAR(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_scale_events_application_id ON scale_events(application_id);
CREATE INDEX idx_scale_events_created_at ON scale_events(created_at);
CREATE INDEX idx_controllers_application_id ON controllers(application_id);
CREATE INDEX idx_controllers_k8s_controller_id ON controllers(k8s_controller_id);
