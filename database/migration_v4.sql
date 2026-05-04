-- Migration v4: Group Chat + Group Meetings (standalone groups)
USE project_management;

ALTER TABLE `groups` ADD COLUMN IF NOT EXISTS chat_id INT NULL AFTER is_private;
ALTER TABLE `groups` ADD CONSTRAINT fk_group_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS group_meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  created_by INT NOT NULL,
  purpose TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  is_instant BOOLEAN DEFAULT FALSE,
  meeting_link VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
