-- Script tạo Admin mặc định
-- Email: admin@shop.com
-- Password: superSecretAdminPassword123
-- Hash được tạo bằng bcrypt với 10 rounds

-- Xóa admin cũ nếu có (optional)
-- DELETE FROM admins WHERE email = 'admin@shop.com';

-- Insert admin mặc định
INSERT INTO admins (name, email, password_hash, role)
VALUES (
  'Super Admin',
  'admin@shop.com',
  '$2b$10$LSJo1cnbdrPIF78KxPHvdeq7TvSNzDAzpGlS.fPDgUmv9G.Kaq/vm',
  'super_admin'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash;

-- Thông tin đăng nhập:
-- Email: admin@shop.com
-- Password: superSecretAdminPassword123
