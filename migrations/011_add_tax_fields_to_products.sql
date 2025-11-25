-- Migration: Add IGST and SGST tax fields to products table
-- Description: Adds tax type selection (IGST for inter-state, SGST for intra-state) and tax rate to products

ALTER TABLE products
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(10) CHECK (tax_type IN ('IGST', 'SGST', NULL)),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;

COMMENT ON COLUMN products.tax_type IS 'Tax type: IGST for inter-state transactions, SGST for intra-state transactions';
COMMENT ON COLUMN products.tax_rate IS 'Tax rate percentage (e.g., 18.00 for 18%)';

-- Create index for tax_type for faster queries
CREATE INDEX IF NOT EXISTS idx_products_tax_type ON products(tax_type);

