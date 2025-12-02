#!/bin/bash

# Script to run database migration
# Usage: ./scripts/run-migration.sh

echo "========================================="
echo "Running Database Migration"
echo "========================================="
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "Please install PostgreSQL client"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract database connection info from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL

echo "📊 Database URL: $DB_URL"
echo ""

# Run migration
echo "▶️  Running migration: migrations/sync-with-new-schema.sql"
echo ""

psql "$DB_URL" -f migrations/sync-with-new-schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Restart your NestJS server"
    echo "  2. Test the new APIs using Swagger: http://localhost:3001/api-docs"
    echo "  3. Check the test script: npm run test:apis"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above."
    exit 1
fi
