-- =====================================================
-- CHATBOT TEST DATA SEED SCRIPT
-- =====================================================
-- Purpose: Create sample data for chatbot integration testing
-- Usage: Run this in your PostgreSQL database
-- =====================================================

-- Clean up existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE customer_id IN (100, 101));
-- DELETE FROM orders WHERE customer_id IN (100, 101);
-- DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE customer_id IN (100, 101));
-- DELETE FROM carts WHERE customer_id IN (100, 101);
-- DELETE FROM wishlist_items WHERE customer_id IN (100, 101);
-- DELETE FROM customers WHERE customer_id IN (100, 101);

-- =====================================================
-- 1. TEST CUSTOMERS
-- =====================================================
INSERT INTO customers (customer_id, full_name, email, password_hash, phone, created_at, updated_at)
VALUES 
(100, 'Test User - Chatbot', 'chatbot.test@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', '0901234567', NOW(), NOW()),
(101, 'Guest User', 'guest@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', '0907654321', NOW(), NOW())
ON CONFLICT (customer_id) DO NOTHING;

-- =====================================================
-- 2. TEST PRODUCTS & VARIANTS
-- =====================================================
-- Assuming you have existing products, we'll create some test variants
-- Adjust product_id based on your actual products table

-- Wedding Collection (for context recommendations)
INSERT INTO products (name, slug, description, price, category, is_active, attributes, created_at, updated_at)
VALUES 
('Áo Sơ Mi Trắng Elegant', 'ao-so-mi-trang-elegant', 'Áo sơ mi trắng sang trọng, hoàn hảo cho đám cưới', 299000, 'Shirts', true, 
 '{"occasion": "wedding", "style": "formal", "color": "white"}', NOW(), NOW()),
 
('Quần Tây Đen Formal', 'quan-tay-den-formal', 'Quần tây đen lịch sự', 399000, 'Pants', true,
 '{"occasion": "wedding", "style": "formal", "color": "black"}', NOW(), NOW()),

-- Beach Collection
('Áo Thun Hawaiian Beach', 'ao-thun-hawaiian-beach', 'Áo thun phong cách biển', 199000, 'Shirts', true,
 '{"occasion": "beach", "style": "casual", "color": "blue"}', NOW(), NOW()),

-- Work Collection
('Áo Vest Công Sở', 'ao-vest-cong-so', 'Áo vest cho môi trường công sở', 599000, 'Jackets', true,
 '{"occasion": "work", "style": "formal", "color": "navy"}', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Create variants for these products
-- Note: Adjust product_id based on actual inserted product IDs
INSERT INTO product_variants (product_id, sku, size, color, total_stock, reserved_stock, price_adjustment, created_at, updated_at)
SELECT p.product_id, 
       CONCAT(p.slug, '-', size_option, '-', color_option),
       size_option,
       color_option,
       100, -- total_stock
       0,   -- reserved_stock
       0,   -- price_adjustment
       NOW(),
       NOW()
FROM products p
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) AS sizes(size_option)
CROSS JOIN (VALUES ('Trắng'), ('Đen'), ('Xanh')) AS colors(color_option)
WHERE p.slug IN ('ao-so-mi-trang-elegant', 'quan-tay-den-formal', 'ao-thun-hawaiian-beach', 'ao-vest-cong-so')
ON CONFLICT (sku) DO NOTHING;

-- =====================================================
-- 3. TEST CARTS
-- =====================================================
INSERT INTO carts (customer_id, created_at, updated_at)
VALUES 
(100, NOW(), NOW()),
(101, NOW(), NOW())
ON CONFLICT (customer_id) DO NOTHING;

-- =====================================================
-- 4. TEST ORDERS
-- =====================================================
-- Order 1: PENDING (can be cancelled)
INSERT INTO orders (customer_id, total_amount, shipping_fee, discount_amount, final_amount, 
                    status, shipping_name, shipping_phone, shipping_address, 
                    shipping_district, shipping_city, created_at, updated_at)
VALUES 
(100, 500000, 30000, 0, 530000, 'PENDING', 
 'Test User', '0901234567', '123 Test Street', 'District 1', 'Ho Chi Minh', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Order 2: PROCESSING (cannot be cancelled easily)
INSERT INTO orders (customer_id, total_amount, shipping_fee, discount_amount, final_amount, 
                    status, shipping_name, shipping_phone, shipping_address, 
                    shipping_district, shipping_city, created_at, updated_at)
VALUES 
(100, 300000, 30000, 0, 330000, 'PROCESSING', 
 'Test User', '0901234567', '123 Test Street', 'District 1', 'Ho Chi Minh', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. TEST WISHLIST
-- =====================================================
-- Add some items to wishlist
INSERT INTO wishlist_items (customer_id, variant_id, created_at)
SELECT 100, pv.variant_id, NOW()
FROM product_variants pv
JOIN products p ON p.product_id = pv.product_id
WHERE p.slug = 'ao-so-mi-trang-elegant'
AND pv.size = 'M'
AND pv.color = 'Trắng'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify data was created:

-- Check customers
-- SELECT customer_id, full_name, email FROM customers WHERE customer_id IN (100, 101);

-- Check products
-- SELECT product_id, name, category, attributes FROM products 
-- WHERE slug IN ('ao-so-mi-trang-elegant', 'quan-tay-den-formal', 'ao-thun-hawaiian-beach', 'ao-vest-cong-so');

-- Check variants
-- SELECT pv.variant_id, p.name, pv.size, pv.color, pv.total_stock 
-- FROM product_variants pv
-- JOIN products p ON p.product_id = pv.product_id
-- WHERE p.slug IN ('ao-so-mi-trang-elegant', 'quan-tay-den-formal')
-- LIMIT 10;

-- Check orders
-- SELECT order_id, customer_id, status, final_amount FROM orders WHERE customer_id = 100;

-- =====================================================
-- TEST CUSTOMER CREDENTIALS
-- =====================================================
-- Email: chatbot.test@example.com
-- Password: test123 (you'll need to hash this properly or use existing password)
-- Customer ID: 100

-- Use this customer_id in your frontend session when testing chatbot
-- =====================================================
