-- Migration: Add review_images and review_videos columns to product_reviews table
-- Description: Adds support for storing media (images and videos) in product reviews
-- Created: 2024-01-16

-- Add review_images column (array of text URLs)
ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS review_images TEXT[] DEFAULT '{}';

-- Add review_videos column (array of text URLs)
ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS review_videos TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN product_reviews.review_images IS 'Array of image URLs for review media';
COMMENT ON COLUMN product_reviews.review_videos IS 'Array of video URLs for review media';

-- Optional: Add indexes for better query performance if needed
-- CREATE INDEX IF NOT EXISTS idx_product_reviews_has_images ON product_reviews ((array_length(review_images, 1) > 0));
-- CREATE INDEX IF NOT EXISTS idx_product_reviews_has_videos ON product_reviews ((array_length(review_videos, 1) > 0));

-- Verification query (uncomment to check after migration)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'product_reviews'
-- AND column_name IN ('review_images', 'review_videos');

