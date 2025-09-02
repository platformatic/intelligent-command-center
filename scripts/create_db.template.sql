-- Template for creating ICC databases and user
-- Placeholders will be replaced:
-- DATABASES - List of database creation statements
-- USERNAME - Single username for all databases
-- PASSWORD - Password for the user

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS dblink;

-- Create databases
{{DATABASES}}

-- Create single user for all databases
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '{{USERNAME}}') THEN
    CREATE USER {{USERNAME}} WITH PASSWORD '{{PASSWORD}}';
  ELSE
    ALTER USER {{USERNAME}} WITH PASSWORD '{{PASSWORD}}';
  END IF;
END $$;

-- Grant privileges on all databases to the single user
{{GRANT_STATEMENTS}}

-- Configure database permissions for each database
{{PERMISSION_STATEMENTS}}

-- Output credentials for confirmation
SELECT '{{USERNAME}}' as username, '{{PASSWORD}}' as password;
