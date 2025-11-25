# Review Media Migration Guide

## Overview
This migration adds support for storing images and videos in product reviews.

## Migration File
📁 `migrations/006_add_review_media_columns.sql`

## What This Migration Does
- Adds `review_images` column to `product_reviews` table (TEXT[] array)
- Adds `review_videos` column to `product_reviews` table (TEXT[] array)
- Sets default values to empty arrays
- Adds column comments for documentation

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `migrations/006_add_review_media_columns.sql`
6. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or run the specific migration
supabase db execute -f migrations/006_add_review_media_columns.sql
```

### Option 3: Direct SQL (if you have database access)
```bash
psql -h [your-db-host] -U postgres -d postgres -f migrations/006_add_review_media_columns.sql
```

## Verification
After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'product_reviews'
AND column_name IN ('review_images', 'review_videos');
```

Expected output:
```
column_name    | data_type | column_default
review_images  | ARRAY     | '{}'
review_videos  | ARRAY     | '{}'
```

## Testing
After migration, test the feature:
1. Go to **Add Product** or **Edit Product** page
2. Add a review with images and/or videos
3. Save the product
4. Edit the product again to verify media persists
5. Check Supabase Dashboard > Table Editor > product_reviews to see the data

## Rollback (if needed)
If you need to remove these columns:

```sql
ALTER TABLE product_reviews DROP COLUMN IF EXISTS review_images;
ALTER TABLE product_reviews DROP COLUMN IF EXISTS review_videos;
```

## Support
- The admin panel (`ProductForm/page.tsx`) already supports this feature
- Reviews can now include multiple images and videos
- Media is uploaded to Cloudinary and URLs are stored in these arrays

## Next Steps
1. Run the migration using Option 1 (Supabase Dashboard)
2. Verify the columns exist
3. Test adding/editing product reviews with media
4. Enjoy the new feature! 🎉

