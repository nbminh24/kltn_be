-- Migration: Add wishlist constraints and indexes
-- Date: 2025-12-05
-- Description: Add unique constraint and indexes to wishlist_items table

-- Add unique constraint to prevent duplicate wishlist entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wishlist_items_unique'
  ) THEN
    ALTER TABLE wishlist_items 
    ADD CONSTRAINT wishlist_items_unique UNIQUE (customer_id, variant_id);
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer 
  ON wishlist_items(customer_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_variant 
  ON wishlist_items(variant_id);

-- Note: Foreign key constraints already exist in the base schema
-- If you need to update them to use ON DELETE CASCADE, run:
-- ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_customer_id_fkey;
-- ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_customer_id_fkey 
--   FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_variant_id_fkey;
-- ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_variant_id_fkey 
--   FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
