-- ============================================================
-- PROJECT MANAGEMENT SYSTEM - Complete Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS project_management;
USE project_management;

-- Plans
CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle ENUM('monthly','yearly','lifetime') DEFAULT 'monthly',
  max_projects INT DEFAULT 5,
  max_members INT DEFAULT 10,
  max_storage_gb INT DEFAULT 5,
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  bio TEXT,
  role ENUM('user','admin') DEFAULT 'user',
  is_org BOOLEAN DEFAULT FALSE,
  plan_id INT,
  plan_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

-- Organizations (user becomes org after purchasing a paid plan)
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  logo VARCHAR(500),
  website VARCHAR(500),
  plan_id INT,
  plan_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

-- Organization Members
CREATE TABLE org_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','admin','member','viewer') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_member (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Connections
CREATE TABLE connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending','accepted','rejected','blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_connection (requester_id, receiver_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Projects (personal or under org)
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  org_id INT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('planning','active','on_hold','completed','archived') DEFAULT 'planning',
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  visibility ENUM('private','team','public') DEFAULT 'private',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Project Members
CREATE TABLE project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','manager','developer','viewer') DEFAULT 'developer',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_member (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Groups
CREATE TABLE groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  org_id INT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  avatar VARCHAR(500),
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Group Members
CREATE TABLE group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','admin','member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_member (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  assignee_id INT,
  created_by INT NOT NULL,
  parent_task_id INT,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status ENUM('todo','in_progress','in_review','done','cancelled') DEFAULT 'todo',
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  due_date TIMESTAMP NULL,
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Task Labels
CREATE TABLE task_labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Task Label Assignments
CREATE TABLE task_label_assignments (
  task_id INT NOT NULL,
  label_id INT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES task_labels(id) ON DELETE CASCADE
);

-- Comments (on tasks or projects)
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entity_type ENUM('task','project') NOT NULL,
  entity_id INT NOT NULL,
  parent_id INT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Chats (direct or group)
CREATE TABLE chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('direct','group') DEFAULT 'direct',
  name VARCHAR(200),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Participants
CREATE TABLE chat_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP NULL,
  UNIQUE KEY uq_chat_participant (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text','file','image') DEFAULT 'text',
  file_url VARCHAR(500),
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscriptions
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  org_id INT,
  plan_id INT NOT NULL,
  status ENUM('active','expired','cancelled','trial') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  payment_ref VARCHAR(255),
  amount_paid DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(300) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default plans
INSERT INTO plans (name, price, billing_cycle, max_projects, max_members, max_storage_gb, features) VALUES
('Free', 0.00, 'lifetime', 3, 5, 1, '["Basic projects","Task management","Direct chat"]'),
('Pro', 9.99, 'monthly', 20, 50, 20, '["Unlimited projects","Advanced analytics","Group chat","Priority support"]'),
('Business', 29.99, 'monthly', 100, 500, 100, '["Everything in Pro","Organization management","Custom roles","API access"]'),
('Enterprise', 99.99, 'monthly', -1, -1, 1000, '["Unlimited everything","Dedicated support","SLA","Custom integrations"]');
