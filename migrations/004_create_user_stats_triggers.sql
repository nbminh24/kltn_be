-- ========== MIGRATION: AUTO-UPDATE USER STATISTICS ==========
-- Run date: 2025-10-26
-- Purpose: Create triggers to auto-update orders_count and total_spent

-- 1. Function to update user stats when order status changes to 'Delivered'
CREATE OR REPLACE FUNCTION update_user_stats_on_order_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if order just became 'Delivered'
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    UPDATE users
    SET 
      orders_count = orders_count + 1,
      total_spent = total_spent + NEW.total
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to revert user stats when order is cancelled
CREATE OR REPLACE FUNCTION revert_user_stats_on_order_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  -- If order was previously 'Delivered' and now 'Cancelled', revert stats
  IF OLD.status = 'Delivered' AND NEW.status = 'Cancelled' THEN
    UPDATE users
    SET 
      orders_count = GREATEST(orders_count - 1, 0),
      total_spent = GREATEST(total_spent - OLD.total, 0)
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for order delivered
DROP TRIGGER IF EXISTS trigger_update_user_stats_delivered ON orders;
CREATE TRIGGER trigger_update_user_stats_delivered
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_on_order_delivered();

-- 4. Create trigger for order cancelled
DROP TRIGGER IF EXISTS trigger_revert_user_stats_cancelled ON orders;
CREATE TRIGGER trigger_revert_user_stats_cancelled
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION revert_user_stats_on_order_cancelled();

-- 5. Verify triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%user_stats%';

-- ========== ROLLBACK SCRIPT ==========
-- DROP TRIGGER IF EXISTS trigger_update_user_stats_delivered ON orders;
-- DROP TRIGGER IF EXISTS trigger_revert_user_stats_cancelled ON orders;
-- DROP FUNCTION IF EXISTS update_user_stats_on_order_delivered();
-- DROP FUNCTION IF EXISTS revert_user_stats_on_order_cancelled();
