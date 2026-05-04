import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-secret');
  if (secret !== 'run-migration-now') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conn = await pool.getConnection();
  const results: string[] = [];

  const steps: { name: string; sql: string }[] = [
    {
      name: 'projects.uuid column',
      sql: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS uuid VARCHAR(36) NULL AFTER id`
    },
    {
      name: 'projects.slug column',
      sql: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(120) NULL AFTER uuid`
    },
    {
      name: 'projects.uuid unique index',
      sql: `ALTER TABLE projects ADD UNIQUE INDEX IF NOT EXISTS uq_projects_uuid (uuid)`
    },
    {
      name: 'projects.slug unique index',
      sql: `ALTER TABLE projects ADD UNIQUE INDEX IF NOT EXISTS uq_projects_slug (slug)`
    },
    {
      name: 'project_groups.uuid column',
      sql: `ALTER TABLE project_groups ADD COLUMN IF NOT EXISTS uuid VARCHAR(36) NULL AFTER id`
    },
    {
      name: 'project_groups.slug column',
      sql: `ALTER TABLE project_groups ADD COLUMN IF NOT EXISTS slug VARCHAR(120) NULL AFTER uuid`
    },
    {
      name: 'project_groups.uuid unique index',
      sql: `ALTER TABLE project_groups ADD UNIQUE INDEX IF NOT EXISTS uq_pg_uuid (uuid)`
    },
    {
      name: 'project_groups.slug unique index',
      sql: `ALTER TABLE project_groups ADD UNIQUE INDEX IF NOT EXISTS uq_pg_slug (slug)`
    },
    {
      name: 'tasks.uuid column',
      sql: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS uuid VARCHAR(36) NULL AFTER id`
    },
    {
      name: 'tasks.slug column',
      sql: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slug VARCHAR(120) NULL AFTER uuid`
    },
    {
      name: 'tasks.uuid unique index',
      sql: `ALTER TABLE tasks ADD UNIQUE INDEX IF NOT EXISTS uq_tasks_uuid (uuid)`
    },
    {
      name: 'tasks.slug unique index',
      sql: `ALTER TABLE tasks ADD UNIQUE INDEX IF NOT EXISTS uq_tasks_slug (slug)`
    },
    {
      name: 'backfill projects uuid+slug',
      sql: `UPDATE projects SET
        uuid = IF(uuid IS NULL, UUID(), uuid),
        slug = IF(slug IS NULL, CONCAT(LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-')), '-', id), slug)
        WHERE uuid IS NULL OR slug IS NULL`
    },
    {
      name: 'backfill project_groups uuid+slug',
      sql: `UPDATE project_groups SET
        uuid = IF(uuid IS NULL, UUID(), uuid),
        slug = IF(slug IS NULL, CONCAT(LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-')), '-', id), slug)
        WHERE uuid IS NULL OR slug IS NULL`
    },
    {
      name: 'backfill tasks uuid+slug',
      sql: `UPDATE tasks SET
        uuid = IF(uuid IS NULL, UUID(), uuid),
        slug = IF(slug IS NULL, CONCAT(LOWER(REGEXP_REPLACE(TRIM(title), '[^a-zA-Z0-9]+', '-')), '-', id), slug)
        WHERE uuid IS NULL OR slug IS NULL`
    },
    {
      name: 'project_groups table',
      sql: `CREATE TABLE IF NOT EXISTS project_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#457b9d',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'project_group_members table',
      sql: `CREATE TABLE IF NOT EXISTS project_group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('lead','member') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pg_member (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'tasks.group_id column',
      sql: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id INT NULL AFTER project_id`
    },
    {
      name: 'tasks.group_id foreign key',
      sql: `ALTER TABLE tasks ADD CONSTRAINT fk_task_group FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE SET NULL`
    },
    {
      name: 'task_history table',
      sql: `CREATE TABLE IF NOT EXISTS task_history (
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
      )`
    },
    {
      name: 'comments.entity_type extend',
      sql: `ALTER TABLE comments MODIFY COLUMN entity_type ENUM('task','project','subtask','document') NOT NULL`
    },
    {
      name: 'comments.is_resolved column',
      sql: `ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE AFTER parent_id`
    },
    {
      name: 'comments.resolved_by column',
      sql: `ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved_by INT NULL AFTER is_resolved`
    },
    {
      name: 'comments.resolved_at column',
      sql: `ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL AFTER resolved_by`
    },
    {
      name: 'comments.resolved_by foreign key',
      sql: `ALTER TABLE comments ADD CONSTRAINT fk_comment_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL`
    },
    {
      name: 'documents table',
      sql: `CREATE TABLE IF NOT EXISTS documents (
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
      )`
    },
    {
      name: 'document_versions table',
      sql: `CREATE TABLE IF NOT EXISTS document_versions (
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
      )`
    },
    {
      name: 'document_access table',
      sql: `CREATE TABLE IF NOT EXISTS document_access (
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
      )`
    },
    {
      name: 'document_folders table',
      sql: `CREATE TABLE IF NOT EXISTS document_folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'documents.folder_id column',
      sql: `ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id INT NULL AFTER project_id`
    },
    {
      name: 'documents.folder_id foreign key',
      sql: `ALTER TABLE documents ADD CONSTRAINT fk_doc_folder FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL`
    },
    {
      name: 'projects.deleted_at column',
      sql: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL`
    },
    {
      name: 'tasks.deleted_at column',
      sql: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL`
    },
    {
      name: 'project_groups.deleted_at column',
      sql: `ALTER TABLE project_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL`
    },
    {
      name: 'project_groups.chat_id column',
      sql: `ALTER TABLE project_groups ADD COLUMN IF NOT EXISTS chat_id INT NULL`
    },
    {
      name: 'project_groups.chat_id foreign key',
      sql: `ALTER TABLE project_groups ADD CONSTRAINT fk_pg_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL`
    },
    {
      name: 'group_invitations table',
      sql: `CREATE TABLE IF NOT EXISTS group_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        invited_by INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        status ENUM('pending','accepted','declined','expired') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'meetings table',
      sql: `CREATE TABLE IF NOT EXISTS meetings (
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
      )`
    },
  ];

  for (const step of steps) {
    try {
      await conn.execute(step.sql);
      results.push(`✓ ${step.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore "duplicate key name" errors for FK/index that already exist
      if (msg.includes('Duplicate key name') || msg.includes('already exists') || msg.includes('duplicate')) {
        results.push(`~ ${step.name} (already exists, skipped)`);
      } else {
        results.push(`✗ ${step.name}: ${msg}`);
      }
    }
  }

  conn.release();
  return NextResponse.json({ results });
}
