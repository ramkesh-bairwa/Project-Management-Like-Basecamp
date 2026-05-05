-- Migration v7: Admin panel + payment + plan limits
USE project_management;

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_tasks INT DEFAULT -1 AFTER max_members;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_groups INT DEFAULT -1 AFTER max_tasks;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS quarterly_price DECIMAL(10,2) DEFAULT NULL AFTER price;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) DEFAULT NULL AFTER quarterly_price;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER is_active;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle ENUM('monthly','quarterly','yearly','lifetime') DEFAULT 'monthly' AFTER plan_id;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) NULL AFTER payment_ref;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL AFTER stripe_session_id;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  billing_cycle ENUM('monthly','quarterly','yearly','lifetime') DEFAULT 'monthly',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  provider ENUM('stripe','sandbox') DEFAULT 'sandbox',
  provider_ref VARCHAR(255),
  stripe_session_id VARCHAR(255),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
