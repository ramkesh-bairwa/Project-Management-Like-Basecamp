-- Migration v6: Soft delete for comments
USE project_management;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
