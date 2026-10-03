-- Razorpay/Paytm checkouts insert provider='razorpay'/'paytm', which the original
-- ENUM('stripe','sandbox') rejects on MySQL 8 strict mode, so the payment never saves.
ALTER TABLE payments
  MODIFY COLUMN provider ENUM('stripe','razorpay','paytm','sandbox') DEFAULT 'sandbox';

-- Admin → Users "banned" role (PUT /api/admin/users) was rejected by ENUM('user','admin').
ALTER TABLE users
  MODIFY COLUMN role ENUM('user','admin','banned') DEFAULT 'user';

-- Any user left with more than one 'active' subscription: keep only the newest active.
UPDATE subscriptions s
JOIN (
  SELECT user_id, MAX(id) AS keep_id FROM subscriptions WHERE status = 'active' GROUP BY user_id
) k ON k.user_id = s.user_id
SET s.status = 'expired'
WHERE s.status = 'active' AND s.id <> k.keep_id;
