-- =====================================================
-- Clear Seed Data Script
-- Xóa data cũ để chuẩn bị seed lại
-- GIỮ LẠI: admins, customers, sizes, chat_sessions, chat_messages
-- =====================================================

BEGIN;

-- Xóa theo thứ tự từ child tables → parent tables (tuân theo foreign keys)

-- 1. Promotion related
DELETE FROM promotion_usage;
DELETE FROM promotion_products;
DELETE FROM promotions;

-- 2. Restock related
DELETE FROM restock_items;
DELETE FROM restock_batches;

-- 3. Support tickets
DELETE FROM support_ticket_replies;
DELETE FROM support_tickets;

-- 4. Product notifications
DELETE FROM product_notifications;

-- 5. Reviews (phụ thuộc orders, variants)
DELETE FROM product_reviews;

-- 6. Wishlist
DELETE FROM wishlist_items;

-- 7. Cart related
DELETE FROM cart_items;
DELETE FROM carts;

-- 8. Order related (phải xóa trước variants vì foreign key)
DELETE FROM order_status_history;
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;

-- 9. Customer addresses
DELETE FROM customer_addresses;

-- 10. Product related (xóa từ child → parent)
DELETE FROM product_images;
DELETE FROM product_variants;
DELETE FROM products;

-- 11. Categories & Colors
DELETE FROM categories;
DELETE FROM colors;

-- 12. Pages
DELETE FROM pages;

-- Reset sequences (để ID bắt đầu lại từ 1)
-- Chỉ reset cho các tables đã xóa
ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS colors_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_variants_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_images_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customer_addresses_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS carts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cart_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_status_history_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS wishlist_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS support_tickets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS support_ticket_replies_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS promotions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS promotion_products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS promotion_usage_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS restock_batches_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS restock_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS pages_id_seq RESTART WITH 1;

COMMIT;

-- =====================================================
-- Kiểm tra kết quả
-- =====================================================

-- Check số lượng records còn lại trong các tables GIỮ LẠI
SELECT 'admins' as table_name, COUNT(*) as count FROM admins
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'sizes', COUNT(*) FROM sizes
UNION ALL
SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;

-- Check các tables đã xóa (nên = 0)
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'colors', COUNT(*) FROM colors
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'customer_addresses', COUNT(*) FROM customer_addresses;
