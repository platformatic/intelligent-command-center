ALTER TABLE messages ADD COLUMN response_headers TEXT;
ALTER TABLE messages ADD COLUMN callback_url VARCHAR(2048);