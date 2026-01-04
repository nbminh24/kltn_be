import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

// Cấu hình database (lấy từ .env hoặc hardcode tạm)
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function resetAdminPassword() {
    try {
        console.log('\n🔧 Script Reset Password Admin\n');
        console.log('=================================\n');

        // Khởi tạo kết nối database
        await AppDataSource.initialize();
        console.log('✅ Đã kết nối database\n');

        // Nhập email admin
        const email = await question('Nhập email admin cần reset: ');

        // Tìm admin trong database
        const result = await AppDataSource.query(
            'SELECT id, name, email, role FROM admins WHERE email = $1',
            [email],
        );

        if (result.length === 0) {
            console.log('\n❌ Không tìm thấy admin với email này!\n');
            await AppDataSource.destroy();
            rl.close();
            return;
        }

        const admin = result[0];
        console.log('\n📋 Thông tin admin:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}\n`);

        // Nhập password mới
        const newPassword = await question('Nhập password mới (tối thiểu 8 ký tự): ');

        if (newPassword.length < 8) {
            console.log('\n❌ Password phải có ít nhất 8 ký tự!\n');
            await AppDataSource.destroy();
            rl.close();
            return;
        }

        // Xác nhận
        const confirm = await question('\nBạn có chắc chắn muốn reset password? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ Đã hủy thao tác.\n');
            await AppDataSource.destroy();
            rl.close();
            return;
        }

        // Hash password mới
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Cập nhật password
        await AppDataSource.query(
            'UPDATE admins SET password_hash = $1 WHERE id = $2',
            [password_hash, admin.id],
        );

        console.log('\n✅ Reset password thành công!');
        console.log(`   Admin: ${admin.email}`);
        console.log(`   Password mới: ${newPassword}\n`);
        console.log('⚠️  Vui lòng lưu lại password này!\n');

        await AppDataSource.destroy();
        rl.close();
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        rl.close();
        process.exit(1);
    }
}

resetAdminPassword();
