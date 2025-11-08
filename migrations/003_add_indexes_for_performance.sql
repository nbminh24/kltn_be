-- ========== MIGRATION: ADD PERFORMANCE INDEXES ==========
-- Run date: 2025-10-26
-- Purpose: Add indexes for better query performance

-- 1. Promotions indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_expiry ON promotions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(status, expiry_date) 
  WHERE status = 'Active';

-- 2. Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(verified_purchase);

-- 3. Orders indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date);

-- 4. Chatbot indexes (already exist but verify)
CREATE INDEX IF NOT EXISTS idx_conversations_resolved ON chatbot_conversations(resolved);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON chatbot_conversations(intent);

-- 5. Verify indexes
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'promotions', 'reviews', 'orders', 'chatbot_conversations')
ORDER BY tablename, indexname;
