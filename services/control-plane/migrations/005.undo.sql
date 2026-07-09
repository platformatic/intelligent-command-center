-- Reverse of 005.do.sql, in reverse order.

-- 5. Revert the skew-independent version records: restore the table-wide unique
-- constraint and the columns. (Best-effort on dev data: re-adding the unique
-- constraint assumes no duplicate live labels remain.)
DROP INDEX IF EXISTS version_registry_live_label;
ALTER TABLE version_registry
  ADD CONSTRAINT version_registry_unique UNIQUE (app_label, version_label);
ALTER TABLE version_registry
  DROP COLUMN plan,
  DROP COLUMN mode,
  ALTER COLUMN deployment_id SET NOT NULL;

-- 4. Drop the scoped deploy tokens.
DROP TABLE IF EXISTS deploy_tokens;

-- 3. Drop the versioning/routing audit trail.
DROP TABLE IF EXISTS version_audit;

-- 2. Drop the per-app versioning config columns.
ALTER TABLE skew_protection_policies
  DROP COLUMN enabled,
  DROP COLUMN mode,
  DROP COLUMN requires_approval;

-- 1. Revert the version lifecycle model to (active, draining, expired).
--
-- PostgreSQL cannot DROP a value from an enum, so the type is recreated. Any
-- rows left in the removed states are first collapsed onto the nearest legacy
-- state: pending-apply (intent to be active) -> active, staged (never routed)
-- -> draining so it enters the normal drain/expire path, pending-expire (intent
-- to remove) -> draining so the legacy drain/expire path finishes it off.
UPDATE version_registry SET status = 'active' WHERE status = 'pending-apply';
UPDATE version_registry SET status = 'draining' WHERE status = 'staged';
UPDATE version_registry SET status = 'draining' WHERE status = 'pending-expire';

DROP INDEX IF EXISTS idx_version_registry_app_id_status;

ALTER TABLE version_registry ALTER COLUMN status DROP DEFAULT;
ALTER TYPE version_status RENAME TO version_status_old;
CREATE TYPE version_status AS ENUM ('active', 'draining', 'expired');
ALTER TABLE version_registry
  ALTER COLUMN status TYPE version_status USING status::text::version_status;
ALTER TABLE version_registry ALTER COLUMN status SET DEFAULT 'active';
DROP TYPE version_status_old;
