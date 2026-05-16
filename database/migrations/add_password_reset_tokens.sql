-- Add password reset token columns to users table (MySQL)
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expiry DATETIME NULL;

-- Create index for faster lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);
