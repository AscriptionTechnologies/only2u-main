-- =====================================================
-- ADD HSN CODE COLUMN TO ORDER_ITEMS TABLE
-- Adds HSN (Harmonized System of Nomenclature) code field
-- for GST compliance and invoice generation
-- =====================================================

-- Add hsn_code column to order_items table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'hsn_code'
    ) THEN
        ALTER TABLE order_items 
        ADD COLUMN hsn_code VARCHAR(20);
        
        -- Add comment for documentation
        COMMENT ON COLUMN order_items.hsn_code IS 'HSN (Harmonized System of Nomenclature) code for GST compliance';
        
        RAISE NOTICE 'Column hsn_code added to order_items table';
    ELSE
        RAISE NOTICE 'Column hsn_code already exists in order_items table';
    END IF;
END $$;

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_order_items_hsn_code ON order_items(hsn_code);

-- Update existing order_items with HSN codes from products table
UPDATE order_items oi
SET hsn_code = p.hsn_code
FROM products p
WHERE oi.product_id = p.id 
  AND oi.hsn_code IS NULL 
  AND p.hsn_code IS NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify column was added:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'order_items' AND column_name = 'hsn_code';

