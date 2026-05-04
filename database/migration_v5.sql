-- Migration v5: Project Group Invitations
USE project_management;

CREATE TABLE IF NOT EXISTS group_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  invited_by INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('pending','accepted','declined','expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),
  FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);
