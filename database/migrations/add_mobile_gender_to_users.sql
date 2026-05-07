ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) DEFAULT NULL AFTER bio,
  ADD COLUMN IF NOT EXISTS gender ENUM('male','female','other','prefer_not_to_say') DEFAULT NULL AFTER mobile;
