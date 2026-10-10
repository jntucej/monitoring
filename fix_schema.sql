-- 1. Fix movement_logs.reason NULL values
UPDATE movement_logs SET reason = 'Regular' WHERE reason IS NULL;
ALTER TABLE movement_logs ALTER COLUMN reason SET NOT NULL;

-- 2. Ensure users.handle is UNIQUE NOT NULL
-- Clean existing data first
UPDATE users SET handle = 'user_' || id::text WHERE handle IS NULL;
ALTER TABLE users ALTER COLUMN handle SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT unique_handle UNIQUE (handle);

-- 3. Alerts FK: Ensure user_unique_id corresponds to users.unique_id
UPDATE alerts SET user_unique_id = NULL WHERE user_unique_id IS NOT NULL AND user_unique_id NOT IN (SELECT unique_id FROM users);
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_user_unique_id FOREIGN KEY (user_unique_id) REFERENCES users(unique_id) ON DELETE SET NULL;
