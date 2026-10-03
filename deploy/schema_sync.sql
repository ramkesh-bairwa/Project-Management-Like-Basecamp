-- Tables and columns the app's code uses that no file in database/ creates.
-- Definitions come from src/app/api/migrate/route.ts and the OAuth callback routes
-- (which used MariaDB-only `ADD COLUMN IF NOT EXISTS`), or from how the code queries them.

-- Auth: email verification and OAuth sign-in
ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) DEFAULT 1 AFTER password,
  ADD COLUMN verification_token VARCHAR(100) NULL AFTER email_verified,
  ADD COLUMN verification_token_expires TIMESTAMP NULL AFTER verification_token,
  ADD COLUMN oauth_provider VARCHAR(20) DEFAULT NULL,
  ADD COLUMN oauth_id VARCHAR(100) DEFAULT NULL,
  ADD COLUMN github_access_token VARCHAR(255) DEFAULT NULL;

-- Public ids, slugs and soft delete for groups and tasks
ALTER TABLE project_groups
  ADD COLUMN uuid VARCHAR(36) NULL AFTER id,
  ADD COLUMN slug VARCHAR(120) NULL AFTER uuid,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
  ADD UNIQUE INDEX uq_pg_uuid (uuid),
  ADD UNIQUE INDEX uq_pg_slug (slug);

ALTER TABLE tasks
  ADD COLUMN uuid VARCHAR(36) NULL AFTER id,
  ADD COLUMN slug VARCHAR(120) NULL AFTER uuid,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
  ADD UNIQUE INDEX uq_tasks_uuid (uuid),
  ADD UNIQUE INDEX uq_tasks_slug (slug);

ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL;

-- Document folders
CREATE TABLE IF NOT EXISTS document_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE documents
  ADD COLUMN folder_id INT NULL AFTER project_id,
  ADD CONSTRAINT fk_doc_folder FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;

-- Admin panel login
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(300) NOT NULL,
  file_type ENUM('image','video','link') DEFAULT 'image',
  file_size INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Organization invitations and custom roles
CREATE TABLE IF NOT EXISTS org_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  token VARCHAR(100) NOT NULL UNIQUE,
  invited_by INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_org_inv_org_email (org_id, email),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS org_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_role (org_id, name),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Custom roles from org_roles are stored on members, so role can't be a fixed ENUM
ALTER TABLE org_members MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'member';
