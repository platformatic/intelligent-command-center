-- Skew/versioning 2.0: lifecycle states + per-app versioning config.

-- 1. Extend the version lifecycle model with three states:
--   staged         deployed and running, awaiting approval, kept off the gateway
--   pending-apply  intent recorded but not yet confirmed live in the cluster;
--                  the single funnel into `active` (transient in observe/manage,
--                  observable in advise mode).
--   pending-expire the mirror of pending-apply: intent to remove recorded but
--                  the teardown not yet observed; the single funnel into
--                  `expired` (transient in observe/manage, observable in advise).
-- ADD VALUE is not used elsewhere in this migration, so it is safe to run inside
-- the migrator's transaction on PostgreSQL 12+.
ALTER TYPE version_status ADD VALUE IF NOT EXISTS 'staged';
ALTER TYPE version_status ADD VALUE IF NOT EXISTS 'pending-apply';
ALTER TYPE version_status ADD VALUE IF NOT EXISTS 'pending-expire';

-- The version manager API lists and acts on versions by application + status.
CREATE INDEX IF NOT EXISTS idx_version_registry_app_id_status
  ON version_registry(application_id, status);

-- 2. Per-app versioning config. Extend the existing policy table rather than
-- adding a parallel mechanism. All columns are nullable: a null means "inherit
-- the cluster default" in resolveSkewPolicy().
--   enabled           per-app participation (cluster master switch stays the env flag)
--   mode              observe | manage | advise (actuation modes)
--   requires_approval approval gate
ALTER TABLE skew_protection_policies
  ADD COLUMN enabled BOOLEAN,
  ADD COLUMN mode VARCHAR(20),
  ADD COLUMN requires_approval BOOLEAN;

-- 3. Versioning/routing audit trail with actor attribution. Append-only log of
-- lifecycle and routing transitions, each with the resolved principal and
-- structured before/after state, so the UI can show who or what made a version
-- usable by clients.
CREATE TABLE version_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- No FK to applications: an audit log is append-only and must survive the
  -- deletion of what it audits (same choice as the activities table).
  application_id uuid NOT NULL,
  version_label VARCHAR(255),
  event VARCHAR(50) NOT NULL,
  from_state VARCHAR(20),
  to_state VARCHAR(20),
  actor_type VARCHAR(20) NOT NULL,
  actor_id VARCHAR(255),
  actor_name VARCHAR(255),
  reason VARCHAR(50),
  detail JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_version_audit_app_version
  ON version_audit(application_id, version_label, created_at);

-- 4. Deploy tokens for CI -> ICC API authentication. A token is bound to one
-- application, can expire and be revoked, and is stored only as a sha-256 hash
-- (the plaintext is shown once at issuance and never persisted). The hash is the
-- lookup key, so it is unique.
CREATE TABLE deploy_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  created_by VARCHAR(255),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deploy_tokens_app ON deploy_tokens(application_id);

-- 5. Skew-independent version records (versions without skew protection). The
-- version_registry is the canonical per-deploy record, populated whether or not
-- skew is on; skew adds routing on top.
--   deployment_id nullable  an advise version is recorded at deploy time, before
--                           any workload/pod exists; it is filled in on confirm.
--   plan                    the advise manifests+commands, stored so the UI can
--                           show them (otherwise only in the deploy API response).
--   mode                    how the version was deployed (observe|manage|advise).
ALTER TABLE version_registry
  ALTER COLUMN deployment_id DROP NOT NULL,
  ADD COLUMN plan JSONB,
  ADD COLUMN mode VARCHAR(20);

-- The version label is skew's routing key (the __plt_dpl cookie and the
-- x-deployment-id header select a version by label), so only LIVE (non-expired)
-- versions must be unique per app. Narrow the table-wide unique constraint to a
-- partial index over the non-expired states, so expired history rows may repeat a
-- label -- deploying `latest` many times yields distinct history rows with a
-- single live one. Predicate references only the pre-existing `expired` value, so
-- it is safe inside the same migration transaction as the ADD VALUE above.
ALTER TABLE version_registry DROP CONSTRAINT version_registry_unique;
CREATE UNIQUE INDEX version_registry_live_label
  ON version_registry (app_label, version_label)
  WHERE status <> 'expired';
