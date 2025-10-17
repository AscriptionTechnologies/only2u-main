-- Migration: Add vendor_id to products table
-- Date: 2025-10-17
-- Description: Adds vendor_id foreign key to products table to link products with vendors

-- Add vendor_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Add index for better performance on vendor queries
CREATE INDEX IF NOT EXISTS idx_products_vendor_id 
ON products(vendor_id);

-- Optional: Migrate existing vendor_name to vendor_id if possible
-- This attempts to match vendor_name with existing vendors in vendors table
-- Only if you have vendors with matching names in the vendors table
-- UPDATE products 
-- SET vendor_id = vendors.id
-- FROM vendors
-- WHERE products.vendor_name = vendors.name 
-- AND products.vendor_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.vendor_id IS 'Foreign key to vendors table. Links product to its vendor.';

-- Note: vendor_name and alias_vendor columns are kept for backwards compatibility
-- You can optionally drop them later if no longer needed:
-- ALTER TABLE products DROP COLUMN IF EXISTS vendor_name;
-- ALTER TABLE products DROP COLUMN IF EXISTS alias_vendor;

-- Verify the migration
SELECT 'Vendor ID column added to products table successfully' AS status;

