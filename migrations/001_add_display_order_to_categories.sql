-- Migration: Add display_order column to categories table
-- Date: 2025-10-15
-- Description: Adds display_order field to enable drag-and-drop category reordering

-- Add display_order column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialize display_order for existing categories based on created_at
WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM categories
)
UPDATE categories 
SET display_order = ordered_categories.new_order
FROM ordered_categories
WHERE categories.id = ordered_categories.id;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_display_order 
ON categories(display_order);

-- Verify the migration
SELECT id, name, display_order, created_at 
FROM categories 
ORDER BY display_order;

