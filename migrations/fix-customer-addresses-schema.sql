-- Migration: Fix customer_addresses schema
-- Handles both cases: column exists or already renamed

-- Step 1: Add new location columns if they don't exist
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS ward VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address_source VARCHAR(20) DEFAULT 'manual';

-- Step 2: Add street_address column if it doesn't exist
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS street_address TEXT;

-- Step 3: Copy data from detailed_address to street_address (if detailed_address exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_addresses' 
        AND column_name = 'detailed_address'
    ) THEN
        -- Copy data
        UPDATE customer_addresses 
        SET street_address = detailed_address 
        WHERE street_address IS NULL;
        
        -- Drop old column
        ALTER TABLE customer_addresses DROP COLUMN detailed_address;
        
        RAISE NOTICE 'Migrated detailed_address to street_address';
    ELSE
        RAISE NOTICE 'Column detailed_address does not exist, skipping migration';
    END IF;
END $$;

-- Step 4: Verify schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customer_addresses'
ORDER BY ordinal_position;
