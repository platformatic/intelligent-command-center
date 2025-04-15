CREATE TABLE activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  username VARCHAR (255),
  application_id uuid,
  event VARCHAR (255) NOT NULL,
  object_type VARCHAR(255),
  object_id uuid,
  data JSONB,
  success BOOLEAN DEFAULT true,
  description VARCHAR (255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
