-- Add profile_type column to flamegraphs table to support both CPU and heap profiles
ALTER TABLE flamegraphs ADD COLUMN profile_type VARCHAR(20) DEFAULT 'cpu' NOT NULL;

-- Add index for profile_type for efficient querying
CREATE INDEX idx_flamegraphs_profile_type ON flamegraphs(profile_type);

-- Add check constraint to ensure only valid profile types
ALTER TABLE flamegraphs ADD CONSTRAINT check_profile_type CHECK (profile_type IN ('cpu', 'heap'));
