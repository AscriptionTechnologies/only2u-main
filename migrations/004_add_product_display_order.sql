-- Migration: Add display_order to products table
-- Date: 2025-10-15
-- Description: Adds display_order field to enable drag-and-drop reordering of featured products

-- Add display_order column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add display_order_within_feature column for ordering within feature types
ALTER TABLE products
ADD COLUMN IF NOT EXISTS display_order_within_feature INTEGER DEFAULT 0;

-- Initialize display_order for existing products based on created_at
WITH ordered_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM products
)
UPDATE products 
SET display_order = ordered_products.new_order
FROM ordered_products
WHERE products.id = ordered_products.id;

-- Initialize display_order_within_feature for trending products
WITH ordered_trending AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM products
  WHERE featured_type = 'trending'
)
UPDATE products 
SET display_order_within_feature = ordered_trending.new_order
FROM ordered_trending
WHERE products.id = ordered_trending.id;

-- Initialize display_order_within_feature for best seller products
WITH ordered_best_sellers AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM products
  WHERE featured_type = 'best_seller'
)
UPDATE products 
SET display_order_within_feature = ordered_best_sellers.new_order
FROM ordered_best_sellers
WHERE products.id = ordered_best_sellers.id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_display_order 
ON products(display_order);

CREATE INDEX IF NOT EXISTS idx_products_display_order_within_feature 
ON products(display_order_within_feature);

CREATE INDEX IF NOT EXISTS idx_products_featured_type_order 
ON products(featured_type, display_order_within_feature);

-- Verify the migration
SELECT 'Product display_order columns added successfully' AS status;

