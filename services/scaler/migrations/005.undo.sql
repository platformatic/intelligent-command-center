-- Remove check constraint
ALTER TABLE flamegraphs DROP CONSTRAINT check_profile_type;

-- Remove index
DROP INDEX idx_flamegraphs_profile_type;

-- Remove profile_type column
ALTER TABLE flamegraphs DROP COLUMN profile_type;
