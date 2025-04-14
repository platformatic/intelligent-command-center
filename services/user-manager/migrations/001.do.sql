CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email varchar(255) DEFAULT NULL::character varying,
  username varchar(255),
  external_id varchar(255),
  role varchar(32),
  joined BOOLEAN default false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
