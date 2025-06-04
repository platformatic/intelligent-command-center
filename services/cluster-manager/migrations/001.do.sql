CREATE TYPE recommendation_status AS ENUM ('calculating', 'old', 'new', 'in_progress', 'skipped', 'aborted', 'done', 'expired');

CREATE TABLE recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  count SERIAL,
  status recommendation_status NOT NULL DEFAULT ('new'),
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

