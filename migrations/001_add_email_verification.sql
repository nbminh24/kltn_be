-- ========== MIGRATION: ADD EMAIL VERIFICATION ==========
-- Run date: 2025-10-26
-- Purpose: Add email verification columns to users table

-- 1. Add columns for email verification
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_token_expires TIMESTAMP;

-- 2. Create index for performance
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- 3. Set existing users as verified (backward compatibility)
UPDATE users 
SET email_verified = TRUE 
WHERE created_at < NOW();

-- 4. Verify migration
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
  COUNT(CASE WHEN email_verified = FALSE THEN 1 END) as unverified_users
FROM users;

-- ========== ROLLBACK SCRIPT (if needed) ==========
-- ALTER TABLE users 
-- DROP COLUMN email_verified,
-- DROP COLUMN verification_token,
-- DROP COLUMN verification_token_expires;
-- 
-- DROP INDEX IF EXISTS idx_users_verification_token;
