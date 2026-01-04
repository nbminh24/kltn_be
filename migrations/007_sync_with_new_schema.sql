-- Migration: Sync with New Schema
-- Date: 2024-12-02
-- Description: Đồng bộ entities với database schema mới

-- ============================================================
-- 1. CREATE NEW TABLES
-- ============================================================

-- Bảng payments
CREATE TABLE IF NOT EXISTS public.payments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  transaction_id character varying,
  amount numeric NOT NULL,
  provider character varying,
  payment_method character varying,
  status character varying,
  response_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

-- Bảng promotion_usage
CREATE TABLE IF NOT EXISTS public.promotion_usage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  promotion_id bigint NOT NULL,
  order_id bigint NOT NULL,
  customer_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_usage_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_usage_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE,
  CONSTRAINT promotion_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT promotion_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON public.promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer_id ON public.promotion_usage(customer_id);

-- Bảng chat_sessions (thay thế chatbot_conversations)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint,
  visitor_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer_id ON public.chat_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor_id ON public.chat_sessions(visitor_id);

-- Bảng chat_messages (thay thế chatbot_messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id bigint,
  sender character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ============================================================
-- 2. ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================

-- products: thêm attributes (jsonb) và deleted_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='attributes') THEN
    ALTER TABLE public.products ADD COLUMN attributes jsonb DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='deleted_at') THEN
    ALTER TABLE public.products ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON public.products USING GIN(attributes);

-- product_variants: thêm version và deleted_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='product_variants' AND column_name='version') THEN
    ALTER TABLE public.product_variants ADD COLUMN version integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='product_variants' AND column_name='deleted_at') THEN
    ALTER TABLE public.product_variants ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_deleted_at ON public.product_variants(deleted_at);

-- customers: thêm deleted_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='customers' AND column_name='deleted_at') THEN
    ALTER TABLE public.customers ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);

-- categories: thêm deleted_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='categories' AND column_name='deleted_at') THEN
    ALTER TABLE public.categories ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at);

-- orders: thêm shipping_city, shipping_district, shipping_ward
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='shipping_city') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_city character varying;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='shipping_district') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_district character varying;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='shipping_ward') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_ward character varying;
  END IF;
END $$;

-- ============================================================
-- 3. REMOVE OLD COLUMNS
-- ============================================================

-- support_tickets: xóa user_id (không tồn tại trong schema mới)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='support_tickets' AND column_name='user_id') THEN
    ALTER TABLE public.support_tickets DROP COLUMN user_id;
  END IF;
END $$;

-- ============================================================
-- 4. ENABLE EXTENSIONS
-- ============================================================

-- Enable unaccent extension for search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- 5. MIGRATE DATA (if needed)
-- ============================================================

-- Migrate chatbot_conversations to chat_sessions (if old tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='chatbot_conversations') THEN
    
    -- Insert old conversations as chat_sessions
    INSERT INTO public.chat_sessions (customer_id, visitor_id, created_at, updated_at)
    SELECT 
      CAST(user_id AS bigint) as customer_id,
      session_id as visitor_id,
      created_at,
      updated_at
    FROM public.chatbot_conversations
    ON CONFLICT DO NOTHING;
    
  END IF;
END $$;

-- Migrate chatbot_messages to chat_messages (if old tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='chatbot_messages') THEN
    
    -- Note: This is complex because we need to map conversation_id to session_id
    -- Skipping for now - manual data migration may be needed
    
  END IF;
END $$;

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON TABLE public.payments IS 'Bảng lưu thông tin giao dịch thanh toán VNPAY';
COMMENT ON TABLE public.promotion_usage IS 'Bảng tracking việc sử dụng mã giảm giá';
COMMENT ON TABLE public.chat_sessions IS 'Bảng lưu phiên chat (thay thế chatbot_conversations)';
COMMENT ON TABLE public.chat_messages IS 'Bảng lưu tin nhắn chat (thay thế chatbot_messages)';

COMMENT ON COLUMN public.products.attributes IS 'Thuộc tính sản phẩm dạng JSONB (material, origin, style, ...)';
COMMENT ON COLUMN public.products.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.product_variants.version IS 'Version control cho inventory management';
COMMENT ON COLUMN public.product_variants.deleted_at IS 'Soft delete timestamp';

-- ============================================================
-- 7. GRANT PERMISSIONS (adjust as needed)
-- ============================================================

-- Grant permissions to your database user
-- GRANT ALL ON public.payments TO your_user;
-- GRANT ALL ON public.promotion_usage TO your_user;
-- GRANT ALL ON public.chat_sessions TO your_user;
-- GRANT ALL ON public.chat_messages TO your_user;

-- ============================================================
-- ROLLBACK SCRIPT (for reference)
-- ============================================================

-- To rollback, uncomment and run:
-- DROP TABLE IF EXISTS public.chat_messages CASCADE;
-- DROP TABLE IF EXISTS public.chat_sessions CASCADE;
-- DROP TABLE IF EXISTS public.promotion_usage CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS attributes;
-- ALTER TABLE public.products DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.product_variants DROP COLUMN IF EXISTS version;
-- ALTER TABLE public.product_variants DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.customers DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.categories DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS shipping_city;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS shipping_district;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS shipping_ward;
