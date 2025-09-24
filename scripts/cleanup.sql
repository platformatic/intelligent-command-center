-- Cleanup script to reverse the database setup from install.sh
-- This script removes the databases and user created during ICC installation

-- Drop all ICC databases
DROP DATABASE IF EXISTS activities;
DROP DATABASE IF EXISTS user_manager;
DROP DATABASE IF EXISTS control_plane;
DROP DATABASE IF EXISTS cron;
DROP DATABASE IF EXISTS compliance;
DROP DATABASE IF EXISTS scaler;
DROP DATABASE IF EXISTS risk_cold_storage;
DROP DATABASE IF EXISTS cluster_manager;
DROP DATABASE IF EXISTS traffic_inspector;
DROP DATABASE IF EXISTS trafficante;

-- Drop the ICC user
DROP USER IF EXISTS platformatic_icc;

-- Output confirmation
SELECT 'ICC databases and user have been removed successfully' as cleanup_status;
