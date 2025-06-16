
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

-- Performance history table for long-term storage
CREATE TABLE performance_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  pods_added INTEGER NOT NULL,
  pre_elu_mean REAL NOT NULL,
  pre_heap_mean REAL NOT NULL,
  pre_elu_trend REAL NOT NULL,
  pre_heap_trend REAL NOT NULL,
  delta_elu REAL NOT NULL,
  delta_heap REAL NOT NULL,
  sigma_elu REAL NOT NULL,
  sigma_heap REAL NOT NULL,
  success_score REAL NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'signal' CHECK (source IN ('signal', 'prediction')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, event_timestamp)
);

-- Add indexes for performance history
CREATE INDEX idx_performance_history_application_id ON performance_history(application_id);
CREATE INDEX idx_performance_history_event_timestamp ON performance_history(event_timestamp);
CREATE INDEX idx_performance_history_created_at ON performance_history(created_at);
