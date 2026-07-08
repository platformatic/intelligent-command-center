-- Schedule priority: higher wins. The scheduler resolves only the highest-priority active tier,
-- so a below-baseline effect (e.g. a quiet Friday) can override an always-on baseline — which a
-- plain MAX of floors could never do. Default 0 keeps every existing schedule in one tier, i.e.
-- identical to the pre-priority max/min intersection.
ALTER TABLE scaler_schedules ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
