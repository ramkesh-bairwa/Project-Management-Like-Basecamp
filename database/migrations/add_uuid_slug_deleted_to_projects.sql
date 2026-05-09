-- Add uuid, slug, and deleted_at columns to projects table
ALTER TABLE projects 
  ADD COLUMN uuid VARCHAR(36) UNIQUE AFTER id,
  ADD COLUMN slug VARCHAR(255) UNIQUE AFTER uuid,
  ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at;
