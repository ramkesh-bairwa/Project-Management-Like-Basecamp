-- Update task status ENUM to include new status values
-- Run this migration to update the database schema

USE project_management;

-- Update the tasks table status column
ALTER TABLE tasks 
MODIFY COLUMN status ENUM(
  'pending',
  'in_progress',
  'under_review',
  'qa',
  'on_hold',
  'completed',
  'reopened',
  'invalid',
  'cancelled'
) DEFAULT 'pending';

-- Update existing 'todo' values to 'pending'
UPDATE tasks SET status = 'pending' WHERE status = 'todo';

-- Update existing 'in_review' values to 'under_review'
UPDATE tasks SET status = 'under_review' WHERE status = 'in_review';

-- Update existing 'done' values to 'completed'
UPDATE tasks SET status = 'completed' WHERE status = 'done';
