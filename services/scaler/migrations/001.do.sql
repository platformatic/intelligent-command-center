
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
  controller_id VARCHAR(255) NOT NULL,
  kind VARCHAR(255) NOT NULL,
  api_version VARCHAR(255) NOT NULL,
  replicas INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

