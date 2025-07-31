ALTER TABLE alerts ADD COLUMN scale_event_id uuid REFERENCES scale_events(id);
