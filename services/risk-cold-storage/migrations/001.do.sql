-- Being a cold storage, these are snaphost of paths.
-- So that we can query filtering by exported_at, group by path and
-- summing up the counters.
CREATE TABLE paths (
  path TEXT NOT NULL,
  dumped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  counter INTEGER NOT NULL DEFAULT 0,
  exported_at TIMESTAMPTZ DEFAULT NULL,
  imported_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (path, dumped_at)
);

CREATE INDEX idx_dumped_at ON paths (dumped_at);
CREATE INDEX idx_path ON paths (path);

CREATE TABLE calculations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE query_type AS ENUM ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

CREATE TABLE db_operations (
  db_id TEXT NOT NULL, -- This is not the key of the table, it identifies the DB
  db_system text,
  db_name text,
  host text,     -- this can actually be null (sqlite)
  port integer,  -- this can actually be null (sqlite)  
  tables text ARRAY NOT NULL,
  columns text ARRAY NOT NULL,
  query_type query_type NOT NULL,
  target_table TEXT DEFAULT NULL, -- This is the table that the INSERT/UPDATE/DELETE is targeting
  paths text ARRAY NOT NULL,
  dumped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_at TIMESTAMPTZ DEFAULT NULL,
  imported_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (db_id, tables, columns, query_type, target_table, paths)
);

CREATE INDEX idx_db_operations_dumped_at ON db_operations (dumped_at);

CREATE TABLE latencies (
  service_from TEXT NULL,
  service_to TEXT NOT NULL,
  mean INTEGER NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  dumped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_at TIMESTAMPTZ DEFAULT NULL,
  imported_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (service_from, service_to, dumped_at)
);

CREATE TABLE imports_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  success BOOLEAN NOT NULL,
  is_export BOOLEAN NOT NULL,
  synched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_name text,
  logs jsonb DEFAULT NULL,
  file_size integer DEFAULT 0,
  latest_data_acquired_at TIMESTAMPTZ DEFAULT NULL,
  import_attempts integer NOT NULL DEFAULT 0,
  discarded boolean DEFAULT false,
  hmac text DEFAULT null
);

