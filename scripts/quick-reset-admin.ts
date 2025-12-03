import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// HƯỚNG DẪN SỬ DỤNG:
// Chạy: npx ts-node scripts/quick-reset-admin.ts <email> <password-mới>
// Ví dụ: npx ts-node scripts/quick-reset-admin.ts admin@shop.com NewPassword123

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'kltn_db',
    entities: [],
    synchronize: false,
});

async function quickResetPassword() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('\n❌ Thiếu tham số!');
        console.log('\nCách sử dụng:');
        console.log('  npx ts-node scripts/quick-reset-admin.ts <email> <password-mới>');
        console.log('\nVí dụ:');
        console.log('  npx ts-node scripts/quick-reset-admin.ts admin@shop.com NewPassword123\n');
        process.exit(1);
    }

    const [email, newPassword] = args;

    if (newPassword.length < 8) {
        console.log('\n❌ Password phải có ít nhất 8 ký tự!\n');
        process.exit(1);
    }

    try {
        console.log('\n🔧 Quick Reset Password Admin\n');
        console.log('=================================\n');

        await AppDataSource.initialize();
        console.log('✅ Đã kết nối database');

        // Tìm admin
        const result = await AppDataSource.query(
            'SELECT id, name, email, role FROM admins WHERE email = $1',
            [email],
        );

        if (result.length === 0) {
            console.log(`\n❌ Không tìm thấy admin với email: ${email}\n`);
            await AppDataSource.destroy();
            process.exit(1);
        }

        const admin = result[0];

        // Hash password mới
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Cập nhật password
        await AppDataSource.query(
            'UPDATE admins SET password_hash = $1 WHERE id = $2',
            [password_hash, admin.id],
        );

        console.log('\n✅ Reset password thành công!');
        console.log('=================================');
        console.log(`📧 Email: ${admin.email}`);
        console.log(`👤 Name: ${admin.name}`);
        console.log(`🔑 Password mới: ${newPassword}`);
        console.log('=================================\n');
        console.log('⚠️  Bạn có thể đăng nhập ngay bây giờ!\n');

        await AppDataSource.destroy();
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(1);
    }
}

quickResetPassword();
