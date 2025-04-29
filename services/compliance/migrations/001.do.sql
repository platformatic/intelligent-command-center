CREATE TYPE rule_type AS ENUM ('global', 'local');

CREATE TABLE rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  label VARCHAR (255),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid,
  result BOOLEAN NOT NULL,
  rule_set JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE rule_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type rule_type NOT NULL,
  application_id uuid,
  enabled BOOLEAN,
  rule_id uuid NOT NULL REFERENCES rules(id),
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metadata (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);