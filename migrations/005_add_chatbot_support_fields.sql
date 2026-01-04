-- Migration: Add fields for chatbot support features
-- Date: 2025-10-26

-- 1. Create product_notifications table
CREATE TABLE IF NOT EXISTS product_notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  size VARCHAR(10),
  price_condition DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_notifications_user ON product_notifications(user_id);
CREATE INDEX idx_product_notifications_product ON product_notifications(product_id);
CREATE INDEX idx_product_notifications_status ON product_notifications(status);

-- 2. Add fields to support_tickets table
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

-- 3. Add foreign key for user_id
ALTER TABLE support_tickets 
ADD CONSTRAINT fk_support_tickets_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Comments
COMMENT ON TABLE product_notifications IS 'Notifications for product availability and price drops';
COMMENT ON COLUMN support_tickets.user_id IS 'User ID for tickets created from chatbot';
COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority: high, medium, low';
COMMENT ON COLUMN support_tickets.message IS 'Detailed message from chatbot';
