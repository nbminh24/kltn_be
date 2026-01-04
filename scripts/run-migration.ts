import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

async function runMigration() {
    console.log('=========================================');
    console.log('Running Database Migration');
    console.log('=========================================\n');

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ Error: DATABASE_URL not found in .env file');
        process.exit(1);
    }

    console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@'));
    console.log('');

    // Parse DATABASE_URL
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
        console.error('❌ Error: Invalid DATABASE_URL format');
        console.error('Expected format: postgresql://user:password@host:port/database');
        process.exit(1);
    }

    const [, user, password, host, port, database] = urlMatch;

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'sync-with-new-schema.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Error: Migration file not found:', migrationPath);
        process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('▶️  Running migration: migrations/sync-with-new-schema.sql\n');

    try {
        // Dynamic import pg
        const { Client } = await import('pg');

        const client = new Client({
            host,
            port: parseInt(port),
            database,
            user,
            password,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        });

        await client.connect();
        console.log('✅ Connected to database\n');

        // Execute migration
        await client.query(migrationSql);

        await client.end();

        console.log('\n✅ Migration completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('  1. Restart your NestJS server: npm run start:dev');
        console.log('  2. Test the new APIs using Swagger: http://localhost:3001/api-docs');
        console.log('');

    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

runMigration();
