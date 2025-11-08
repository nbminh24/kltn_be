import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Script để tạo admin mặc định
async function createDefaultAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/entities/*.entity.ts'],
  });

  await dataSource.initialize();

  const hashedPassword = await bcrypt.hash('superSecretAdminPassword123', 10);

  await dataSource.query(`
    INSERT INTO admins (name, email, password_hash, role, created_at, updated_at)
    VALUES ('Super Admin', 'admin@shop.com', $1, 'super_admin', NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
  `, [hashedPassword]);

  console.log('✅ Default admin created: admin@shop.com / superSecretAdminPassword123');

  await dataSource.destroy();
}

createDefaultAdmin().catch(console.error);
