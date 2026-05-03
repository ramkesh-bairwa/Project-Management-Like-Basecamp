-- ============================================================
-- MIGRATION: Groups under Projects, Task History, Nested Comments, Documents
-- Run this on top of the existing schema
-- ============================================================

USE project_management;

-- 1. Project Groups (groups scoped to a project, different from org groups)
CREATE TABLE IF NOT EXISTS project_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#457b9d',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Project Group Members
CREATE TABLE IF NOT EXISTS project_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('lead','member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pg_member (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Add group_id to tasks (task belongs to a project group)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id INT NULL AFTER project_id;
ALTER TABLE tasks ADD CONSTRAINT fk_task_group FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE SET NULL;

-- 4. Task History — every change tracked
CREATE TABLE IF NOT EXISTS task_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  changed_by INT NOT NULL,
  action ENUM(
    'created','status_changed','assigned','unassigned',
    'priority_changed','title_changed','description_changed',
    'due_date_changed','reopened','closed','moved_group',
    'subtask_added','comment_added','document_attached'
  ) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Extend comments: add is_resolved, entity_type subtask support
ALTER TABLE comments MODIFY COLUMN entity_type ENUM('task','project','subtask','document') NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE AFTER parent_id;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved_by INT NULL AFTER is_resolved;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL AFTER resolved_by;
ALTER TABLE comments ADD CONSTRAINT fk_comment_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  type ENUM('doc','file','spreadsheet','design','other') DEFAULT 'doc',
  status ENUM('draft','active','archived') DEFAULT 'active',
  current_version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Document Versions — full history of every edit/upload
CREATE TABLE IF NOT EXISTS document_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  version_number INT NOT NULL,
  uploaded_by INT NOT NULL,
  content LONGTEXT,
  file_url VARCHAR(500),
  file_name VARCHAR(300),
  file_size INT,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Document Access (who can view/edit)
CREATE TABLE IF NOT EXISTS document_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  user_id INT NOT NULL,
  permission ENUM('view','edit','admin') DEFAULT 'view',
  granted_by INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_access (document_id, user_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
);
