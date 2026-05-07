-- Reverse of 011.do.sql.

-- Restore the K8s-specific columns. NOT NULL is enforced after backfill.
ALTER TABLE controllers ADD COLUMN kind VARCHAR(255);
ALTER TABLE controllers ADD COLUMN api_version VARCHAR(255);

UPDATE controllers
SET
  kind = COALESCE(provider_metadata ->> 'kind', 'Deployment'),
  api_version = COALESCE(provider_metadata ->> 'apiVersion', 'apps/v1');

ALTER TABLE controllers ALTER COLUMN kind SET NOT NULL;
ALTER TABLE controllers ALTER COLUMN api_version SET NOT NULL;

ALTER TABLE controllers DROP COLUMN provider_metadata;

ALTER INDEX idx_controllers_controller_id RENAME TO idx_controllers_k8s_controller_id;
ALTER TABLE controllers RENAME COLUMN controller_id TO k8s_controller_id;
