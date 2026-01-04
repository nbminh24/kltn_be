-- Migration: Add location fields to customer_addresses
-- Date: 2024-12-20

-- Add new location columns
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS ward VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address_source VARCHAR(20) DEFAULT 'manual';

-- Rename detailed_address to street_address
ALTER TABLE customer_addresses 
RENAME COLUMN detailed_address TO street_address;

-- Done!
SELECT 'Migration completed successfully!' as status;
