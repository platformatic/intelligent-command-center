-- Remove the trends-learning performance_history table.
-- It was written by the reactive path but only read by the (now removed)
-- trends-learning algorithm. Reactive scaling keeps its history in Valkey.
DROP TABLE IF EXISTS performance_history;
