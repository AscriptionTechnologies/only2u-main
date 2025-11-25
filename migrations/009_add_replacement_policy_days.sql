-- Migration: add replacement_policy_days to products
-- Description: Adds an integer column to track product-specific replacement window
-- Generated: 2025-11-09

ALTER TABLE products
ADD COLUMN IF NOT EXISTS replacement_policy_days INTEGER CHECK (replacement_policy_days IS NULL OR replacement_policy_days >= 0);

COMMENT ON COLUMN products.replacement_policy_days IS 'Number of days after purchase during which the product can be replaced.';

CREATE INDEX IF NOT EXISTS idx_products_replacement_policy_days ON products (replacement_policy_days);

SELECT 'replacement_policy_days column added to products table successfully' AS status;

