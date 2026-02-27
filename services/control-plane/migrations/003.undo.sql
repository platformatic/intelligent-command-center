DROP TABLE IF EXISTS skew_protection_policies;
DROP TABLE IF EXISTS version_registry;
DROP TYPE IF EXISTS version_status;

-- Remove 'stopped' from deployment_status enum
ALTER TABLE deployments ALTER COLUMN status TYPE VARCHAR(255);
UPDATE deployments SET status = 'failed' WHERE status = 'stopped';
DROP TYPE deployment_status;
CREATE TYPE deployment_status AS ENUM ('starting', 'started', 'failed');
ALTER TABLE deployments ALTER COLUMN status TYPE deployment_status USING status::deployment_status;
