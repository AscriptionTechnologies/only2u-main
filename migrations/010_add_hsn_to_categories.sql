-- Migration: Add HSN number to categories table
-- Description: Adds HSN (Harmonized System of Nomenclature) code field to categories for tax purposes

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);

COMMENT ON COLUMN categories.hsn_code IS 'HSN code for the category, used for tax calculation and invoicing';

