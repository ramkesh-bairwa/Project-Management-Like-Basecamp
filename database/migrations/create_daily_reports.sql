-- Daily Reports Tables
-- ============================================================

-- Daily Reports
CREATE TABLE daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  report_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_project_date (user_id, project_id, report_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Daily Report Tasks
CREATE TABLE daily_report_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  status ENUM('todo','in_progress','done','blocked') DEFAULT 'todo',
  priority ENUM('low','medium','high') DEFAULT 'medium',
  task_type ENUM('feature','bug','testing','meeting') DEFAULT 'feature',
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  completion_percentage INT DEFAULT 0,
  blocker_issue TEXT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Daily Report Members (for admin to add members to reports)
CREATE TABLE daily_report_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  user_id INT NOT NULL,
  added_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_date_user (report_date, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
);