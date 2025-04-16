DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
        CREATE TYPE job_type_enum AS ENUM ('ICC','WATT', 'USER');
    END IF;
END $$;
ALTER TABLE jobs ADD COLUMN job_type job_type_enum NOT NULL DEFAULT 'USER';
