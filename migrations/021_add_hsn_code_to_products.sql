-- =====================================================
-- ADD HSN CODE COLUMN TO PRODUCTS TABLE
-- Adds HSN (Harmonized System of Nomenclature) code field
-- for GST compliance and invoice generation
-- =====================================================

-- Add hsn_code column to products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'hsn_code'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN hsn_code VARCHAR(20);
        
        -- Add comment for documentation
        COMMENT ON COLUMN products.hsn_code IS 'HSN (Harmonized System of Nomenclature) code for GST compliance';
        
        RAISE NOTICE 'Column hsn_code added to products table';
    ELSE
        RAISE NOTICE 'Column hsn_code already exists in products table';
    END IF;
END $$;

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_products_hsn_code ON products(hsn_code);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify column was added:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name = 'hsn_code';

