-- Test data for development/testing
-- Mock user for testing (matches the mock userId in JwtAuthGuard)

-- Insert test user
INSERT INTO users (id, name, email, password_hash, phone, status, orders_count, total_spent, created_at, updated_at)
VALUES 
  ('user_mock_test_123', 'Test User', 'test@example.com', '$2b$10$YourHashedPasswordHere', '0123456789', 'Active', 0, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some test categories
INSERT INTO categories (id, name, slug, description, status, products_count, created_at, updated_at)
VALUES 
  ('cat_001', 'Điện thoại', 'dien-thoai', 'Điện thoại di động', 'Active', 0, NOW(), NOW()),
  ('cat_002', 'Laptop', 'laptop', 'Máy tính xách tay', 'Active', 0, NOW(), NOW()),
  ('cat_003', 'Tablet', 'tablet', 'Máy tính bảng', 'Active', 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some test products
INSERT INTO products (id, name, slug, sku, description, category_id, price, original_price, status, rating, reviews_count, sold_count, created_at, updated_at)
VALUES 
  ('prod_001', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 'IP15PM-256', 'iPhone 15 Pro Max 256GB', 'cat_001', 29990000, 32990000, 'Active', 4.8, 150, 500, NOW(), NOW()),
  ('prod_002', 'Samsung Galaxy S24', 'samsung-galaxy-s24', 'SS24-256', 'Samsung Galaxy S24 256GB', 'cat_001', 21990000, 24990000, 'Active', 4.7, 120, 350, NOW(), NOW()),
  ('prod_003', 'MacBook Pro 14', 'macbook-pro-14', 'MBP14-M3', 'MacBook Pro 14" M3', 'cat_002', 45990000, 49990000, 'Active', 4.9, 85, 200, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert product images
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, created_at)
VALUES 
  ('img_001', 'prod_001', 'https://via.placeholder.com/600x600/007AFF/ffffff?text=iPhone+15+Pro', 'iPhone 15 Pro Max', 1, NOW()),
  ('img_002', 'prod_002', 'https://via.placeholder.com/600x600/1428A0/ffffff?text=Galaxy+S24', 'Samsung Galaxy S24', 1, NOW()),
  ('img_003', 'prod_003', 'https://via.placeholder.com/600x600/000000/ffffff?text=MacBook+Pro', 'MacBook Pro 14', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert product variants
INSERT INTO product_variants (id, product_id, sku, size, color, stock, created_at, updated_at)
VALUES 
  ('var_001', 'prod_001', 'IP15PM-256-BLK', '256GB', 'Black', 50, NOW(), NOW()),
  ('var_002', 'prod_001', 'IP15PM-256-WHT', '256GB', 'White', 30, NOW(), NOW()),
  ('var_003', 'prod_002', 'SS24-256-BLK', '256GB', 'Black', 45, NOW(), NOW()),
  ('var_004', 'prod_003', 'MBP14-M3-512', '512GB', 'Space Gray', 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test address for user
INSERT INTO addresses (id, user_id, full_name, phone_number, address_line, ward, district, city, postal_code, is_default, created_at, updated_at)
VALUES 
  ('addr_001', 'user_mock_test_123', 'Test User', '0123456789', '123 Test Street', 'Phường 1', 'Quận 1', 'TP. Hồ Chí Minh', '700000', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some promotions
INSERT INTO promotions (id, code, name, description, type, discount_value, min_order_value, max_discount, usage_limit, times_used, expiry_date, status, created_at, updated_at)
VALUES 
  ('promo_001', 'WELCOME10', 'Welcome Discount', 'Giảm 10% cho đơn hàng đầu tiên', 'Percentage', 10, 500000, 100000, 1000, 0, NOW() + INTERVAL '30 days', 'Active', NOW(), NOW()),
  ('promo_002', 'FREESHIP', 'Free Shipping', 'Miễn phí vận chuyển', 'FreeShipping', 0, 200000, 0, 5000, 0, NOW() + INTERVAL '60 days', 'Active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert static pages
INSERT INTO static_pages (id, slug, title, content, status, last_modified, created_at, updated_at)
VALUES 
  ('page_001', 'about', 'About Us', '<h1>About Our Store</h1><p>Welcome to our e-commerce platform...</p>', 'Published', NOW(), NOW(), NOW()),
  ('page_002', 'faq', 'FAQ', '<h1>Frequently Asked Questions</h1><p>Common questions and answers...</p>', 'Published', NOW(), NOW(), NOW()),
  ('page_003', 'terms', 'Terms of Service', '<h1>Terms of Service</h1><p>Terms and conditions...</p>', 'Published', NOW(), NOW(), NOW()),
  ('page_004', 'privacy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Privacy policy details...</p>', 'Published', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
