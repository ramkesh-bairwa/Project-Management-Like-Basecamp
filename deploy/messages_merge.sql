-- `messages` is shared by the chats system (chat_id, type; schema.sql) and the
-- conversations system (conversation_id, message_type, file_*; create_chat_system_mysql.sql,
-- whose CREATE TABLE IF NOT EXISTS is skipped because schema.sql created the table first).
-- Add the conversation columns so both code paths work against one table.
ALTER TABLE messages
  MODIFY COLUMN chat_id INT NULL,
  ADD COLUMN conversation_id INT NULL AFTER chat_id,
  ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' AFTER type,
  ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url,
  ADD COLUMN file_size INT NULL AFTER file_name,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
