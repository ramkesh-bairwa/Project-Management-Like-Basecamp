-- Add image column to projects table
ALTER TABLE projects ADD COLUMN image VARCHAR(500) AFTER description;
