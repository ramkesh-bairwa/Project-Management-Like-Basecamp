-- Migration v10: Site settings for dynamic branding
USE project_management;

CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_settings (`key`, value) VALUES
  ('site_name', 'ProjectHub'),
  ('site_logo_url', ''),
  ('primary_color', '#1d3557'),
  ('accent_color', '#e63946'),
  ('secondary_color', '#457b9d'),
  ('logo_letter', 'P')
ON DUPLICATE KEY UPDATE `key`=`key`;
