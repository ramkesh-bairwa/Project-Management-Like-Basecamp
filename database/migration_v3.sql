-- Migration: Group Chat + Meetings
USE project_management;

-- Add chat_id to project_groups
ALTER TABLE project_groups ADD COLUMN IF NOT EXISTS chat_id INT NULL AFTER color;
ALTER TABLE project_groups ADD CONSTRAINT fk_pg_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  created_by INT NOT NULL,
  purpose TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  is_instant BOOLEAN DEFAULT FALSE,
  meeting_link VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
