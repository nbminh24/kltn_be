-- ========================================
-- INIT LOCAL DATABASE FOR DEVELOPMENT
-- ========================================
-- Run this after creating local PostgreSQL
-- Usage: psql -U postgres -d kltn_db -f init-local-db.sql

-- Drop existing tables if any
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS support_ticket_replies CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS restock_items CASCADE;
DROP TABLE IF EXISTS restock_batches CASCADE;
DROP TABLE IF EXISTS promotion_usage CASCADE;
DROP TABLE IF EXISTS promotion_products CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS sizes CASCADE;
DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ========================================
-- ADMINS
-- ========================================
CREATE TABLE admins (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR,
  email VARCHAR NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CUSTOMERS
-- ========================================
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR,
  email VARCHAR NOT NULL UNIQUE,
  password_hash TEXT,
  status VARCHAR DEFAULT 'inactive',
  refresh_token TEXT,
  refresh_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_refresh_token ON customers(refresh_token);

-- ========================================
-- PRODUCT ATTRIBUTES
-- ========================================
CREATE TABLE colors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  hex_code VARCHAR
);

CREATE TABLE sizes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  status VARCHAR DEFAULT 'active'
);

-- ========================================
-- PRODUCTS
-- ========================================
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  description TEXT,
  full_description TEXT,
  cost_price NUMERIC,
  selling_price NUMERIC NOT NULL,
  status VARCHAR DEFAULT 'active',
  thumbnail_url TEXT,
  average_rating NUMERIC DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  size_id BIGINT REFERENCES sizes(id),
  color_id BIGINT REFERENCES colors(id),
  name VARCHAR,
  sku VARCHAR NOT NULL UNIQUE,
  total_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'active'
);

CREATE TABLE product_images (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id),
  image_url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false
);

CREATE TABLE product_reviews (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id),
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  order_id BIGINT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CART
-- ========================================
CREATE TABLE carts (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT UNIQUE REFERENCES customers(id),
  session_id VARCHAR UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(id),
  variant_id BIGINT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- ========================================
-- ORDERS
-- ========================================
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id),
  customer_email VARCHAR,
  shipping_address TEXT NOT NULL,
  shipping_phone VARCHAR NOT NULL,
  fulfillment_status VARCHAR DEFAULT 'pending',
  payment_status VARCHAR DEFAULT 'unpaid',
  payment_method VARCHAR DEFAULT 'cod',
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  variant_id BIGINT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC NOT NULL
);

CREATE TABLE order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  status VARCHAR NOT NULL,
  admin_id BIGINT REFERENCES admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PROMOTIONS
-- ========================================
CREATE TABLE promotions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  discount_value NUMERIC NOT NULL,
  discount_type VARCHAR NOT NULL,
  number_limited INTEGER,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR DEFAULT 'scheduled'
);

CREATE TABLE promotion_products (
  id BIGSERIAL PRIMARY KEY,
  promotion_id BIGINT NOT NULL REFERENCES promotions(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  flash_sale_price NUMERIC NOT NULL
);

CREATE TABLE promotion_usage (
  id BIGSERIAL PRIMARY KEY,
  promotion_id BIGINT NOT NULL REFERENCES promotions(id),
  order_id BIGINT NOT NULL REFERENCES orders(id),
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INVENTORY
-- ========================================
CREATE TABLE restock_batches (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES admins(id),
  type VARCHAR DEFAULT 'Manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE restock_items (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES restock_batches(id),
  variant_id BIGINT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- ========================================
-- SUPPORT
-- ========================================
CREATE TABLE support_tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_code VARCHAR NOT NULL UNIQUE,
  customer_id BIGINT REFERENCES customers(id),
  customer_email VARCHAR,
  subject VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  source VARCHAR DEFAULT 'contact_form',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE support_ticket_replies (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id),
  admin_id BIGINT REFERENCES admins(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- WISHLIST & ADDRESS
-- ========================================
CREATE TABLE wishlist_items (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  variant_id BIGINT NOT NULL REFERENCES product_variants(id)
);

CREATE TABLE customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  is_default BOOLEAN DEFAULT false,
  address_type VARCHAR DEFAULT 'Home',
  detailed_address TEXT NOT NULL,
  phone_number VARCHAR NOT NULL
);

-- ========================================
-- SEED DATA (Optional test data)
-- ========================================

-- Test admin
INSERT INTO admins (name, email, password_hash, role) VALUES
('Admin Test', 'admin@test.com', '$2b$10$dummyhash', 'admin');

-- Test categories
INSERT INTO categories (name, slug) VALUES
('Fashion', 'fashion'),
('Electronics', 'electronics');

-- Test customer
INSERT INTO customers (name, email, password_hash, status) VALUES
('Test User', 'test@test.com', '$2b$10$dummyhash', 'active');

COMMENT ON DATABASE kltn_db IS 'Local development database for KLTN E-commerce';
