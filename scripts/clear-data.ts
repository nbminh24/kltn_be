import { DataSource } from 'typeorm';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config();

// Parse DATABASE_URL or use individual env vars
let dbConfig: any;

if (process.env.DATABASE_URL) {
    const urlMatch = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlMatch) {
        const [, user, password, host, port, database] = urlMatch;
        dbConfig = {
            type: 'postgres' as const,
            host,
            port: parseInt(port),
            username: user,
            password,
            database,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            entities: [],
            synchronize: false,
        };
    } else {
        console.error('❌ Invalid DATABASE_URL format');
        process.exit(1);
    }
} else {
    dbConfig = {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'kltn_db',
        entities: [],
        synchronize: false,
    };
}

const AppDataSource = new DataSource(dbConfig);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function clearAllData() {
    try {
        console.log('\n⚠️  WARNING: This will DELETE ALL DATA in the database!\n');

        const confirm = await question('Type "YES" to confirm deletion: ');

        if (confirm !== 'YES') {
            console.log('\n❌ Cancelled. No data was deleted.\n');
            rl.close();
            return;
        }

        await AppDataSource.initialize();
        console.log('\n🗑️  Clearing all data...\n');

        // Disable foreign key checks temporarily
        await AppDataSource.query('SET session_replication_role = replica;');

        const tables = [
            'promotion_usage',
            'promotion_products',
            'promotions',
            'restock_items',
            'restock_batches',
            'wishlist_items',
            'cart_items',
            'carts',
            'product_notifications',
            'product_reviews',
            'order_status_history',
            'order_items',
            'payments',
            'orders',
            'support_ticket_replies',
            'support_tickets',
            'chat_messages',
            'chat_sessions',
            'customer_addresses',
            'product_images',
            'product_variants',
            'products',
            'categories',
            'sizes',
            'colors',
            'pages'
        ];

        for (const table of tables) {
            await AppDataSource.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
            console.log(`   ✓ Cleared ${table}`);
        }

        // Re-enable foreign key checks
        await AppDataSource.query('SET session_replication_role = DEFAULT;');

        console.log('\n✅ All data cleared successfully!\n');
        console.log('💡 You can now run: npm run seed\n');

        await AppDataSource.destroy();
        rl.close();
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        rl.close();
        process.exit(1);
    }
}

clearAllData();
