-- Add image columns to projects, groups, and tasks tables

ALTER TABLE projects ADD COLUMN image VARCHAR(500) AFTER description;
ALTER TABLE groups ADD COLUMN image VARCHAR(500) AFTER avatar;
ALTER TABLE tasks ADD COLUMN image VARCHAR(500) AFTER description;
