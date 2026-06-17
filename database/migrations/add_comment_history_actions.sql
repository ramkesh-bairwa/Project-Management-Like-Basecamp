-- Add missing comment action types to task_history action ENUM
ALTER TABLE task_history MODIFY COLUMN action ENUM(
  'created','status_changed','assigned','unassigned',
  'priority_changed','title_changed','description_changed',
  'due_date_changed','reopened','closed','moved_group',
  'subtask_added','subtask_status_changed',
  'comment_added','comment_deleted','comment_updated',
  'document_attached','attachment_deleted','deleted'
) NOT NULL;
