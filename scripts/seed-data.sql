-- Seed data cho Categories, Sizes, và Colors
-- Chạy script này sau khi đã tạo tables

-- ========================================
-- CATEGORIES
-- ========================================
INSERT INTO categories (name, slug, status) VALUES
('Áo Thun', 'ao-thun', 'active'),
('Áo Sơ Mi', 'ao-so-mi', 'active'),
('Áo Khoác', 'ao-khoac', 'active'),
('Quần Jeans', 'quan-jeans', 'active'),
('Quần Shorts', 'quan-shorts', 'active'),
('Phụ Kiện', 'phu-kien', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- SIZES
-- ========================================
INSERT INTO sizes (name, sort_order) VALUES
('XS', 1),
('S', 2),
('M', 3),
('L', 4),
('XL', 5),
('XXL', 6);

-- ========================================
-- COLORS
-- ========================================
INSERT INTO colors (name, hex_code) VALUES
('Trắng', '#FFFFFF'),
('Đen', '#000000'),
('Xám', '#808080'),
('Xanh Navy', '#000080'),
('Xanh Dương', '#0000FF'),
('Đỏ', '#FF0000'),
('Vàng', '#FFFF00'),
('Hồng', '#FFC0CB'),
('Nâu', '#A52A2A'),
('Be', '#F5F5DC');

-- ========================================
-- LOG
-- ========================================
SELECT 'Seed data inserted successfully!' as message;
