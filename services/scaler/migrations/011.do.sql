-- Provider-agnostic refactor of the controllers table.
--
-- The "controllers" table represents the top-level compute group that manages
-- pod/task replicas (Deployment/StatefulSet in K8s, Service in ECS, etc.).
-- Provider-specific identifying info (kind, api_version) is now stored as an
-- opaque JSON blob that the scaler round-trips back to machinist on every
-- call. The scaler does not interpret the contents.

ALTER TABLE controllers RENAME COLUMN k8s_controller_id TO controller_id;
ALTER INDEX idx_controllers_k8s_controller_id RENAME TO idx_controllers_controller_id;

-- Add the opaque metadata column and backfill from existing K8s columns so
-- existing rows continue to work without re-discovery on next sync.
ALTER TABLE controllers ADD COLUMN provider_metadata JSONB;

UPDATE controllers
SET provider_metadata = jsonb_build_object('kind', kind, 'apiVersion', api_version);

-- The K8s-specific columns are no longer used.
ALTER TABLE controllers DROP COLUMN kind;
ALTER TABLE controllers DROP COLUMN api_version;
