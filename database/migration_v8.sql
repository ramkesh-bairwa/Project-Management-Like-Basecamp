-- Migration v8: Payment gateway configuration
USE project_management;

CREATE TABLE IF NOT EXISTS payment_gateways (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('stripe','razorpay','paytm','sandbox') NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  display_name VARCHAR(100) NOT NULL,
  config JSON NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO payment_gateways (provider, display_name, is_active, config) VALUES
('sandbox',  'Sandbox (Test)',  TRUE,  '{"note":"Test mode — no real charges"}'),
('stripe',   'Stripe',         FALSE, '{"publishable_key":"","secret_key":"","webhook_secret":""}'),
('razorpay', 'Razorpay',       FALSE, '{"key_id":"","key_secret":"","webhook_secret":""}'),
('paytm',    'Paytm',          FALSE, '{"merchant_id":"","merchant_key":"","website":"WEBSTAGING","industry_type":"Retail","channel_id":"WEB"}');
