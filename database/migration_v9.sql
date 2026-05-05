-- Migration v9: Add 'admin' role to project_members
USE project_management;

ALTER TABLE project_members
  MODIFY COLUMN role ENUM('owner','admin','manager','developer','designer','viewer') DEFAULT 'developer';
