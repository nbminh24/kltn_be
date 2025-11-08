-- ========== MIGRATION: SYNC USER STATISTICS ==========
-- Run date: 2025-10-26
-- Purpose: One-time sync of orders_count and total_spent for existing users

-- 1. Sync orders_count and total_spent from orders table
UPDATE users u SET
  orders_count = (
    SELECT COUNT(*) 
    FROM orders 
    WHERE user_id = u.id 
    AND status = 'Delivered'
  ),
  total_spent = (
    SELECT COALESCE(SUM(total), 0) 
    FROM orders 
    WHERE user_id = u.id 
    AND status = 'Delivered'
  );

-- 2. Verify sync
SELECT 
  u.id,
  u.name,
  u.orders_count,
  u.total_spent,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status = 'Delivered') as actual_orders,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id AND status = 'Delivered') as actual_spent
FROM users u
LIMIT 10;
