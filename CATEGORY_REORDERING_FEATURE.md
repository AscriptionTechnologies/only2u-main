# Category Drag-and-Drop Reordering Feature

## Overview
This feature allows administrators to reorder product categories using an intuitive drag-and-drop interface. The category order is persisted in the database and reflected across both the admin panel and the user-facing application.

## What Was Implemented

### 1. **Database Schema Update**
- Added `display_order` column to the `categories` table
- Created an index for optimized querying
- Migration file: `migrations/001_add_display_order_to_categories.sql`

### 2. **Backend API**
- Created a new API endpoint: `/api/categories/reorder`
- Handles batch updates of category display order
- Path: `app/api/categories/reorder/route.ts`

### 3. **Frontend UI Components**
- Integrated `@dnd-kit` library for drag-and-drop functionality
- Added visual drag handles to category cards
- Smooth animations and visual feedback during dragging
- Updated: `app/admin/CategoryManagement/page.tsx`

### 4. **Dependencies Added**
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable list implementation
- `@dnd-kit/utilities` - Utility functions for transformations

## Setup Instructions

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run the migration:

```sql
-- Navigate to: Database > SQL Editor > New Query
-- Copy and paste the contents from: migrations/001_add_display_order_to_categories.sql
```

Or run this SQL directly:

```sql
-- Add display_order column
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialize display_order for existing categories
WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM categories
)
UPDATE categories 
SET display_order = ordered_categories.new_order
FROM ordered_categories
WHERE categories.id = ordered_categories.id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_categories_display_order 
ON categories(display_order);
```

### Step 2: Verify Installation

The npm packages have already been installed. If you need to reinstall:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 3: Deploy Changes

After running the migration, restart your development server:

```bash
npm run dev
```

## How to Use

1. **Navigate** to the Category Management page in your admin panel
2. **Look** for the drag handle icon (≡) on the left side of each category card
3. **Click and hold** the drag handle
4. **Drag** the category card to your desired position
5. **Release** to drop it in the new position
6. The order is **automatically saved** to the database

## Features

✅ **Drag-and-Drop Interface**
- Intuitive grab handles on each category
- Smooth animations during drag
- Visual feedback (opacity change) while dragging

✅ **Automatic Persistence**
- Order saves immediately to the database
- No manual save button needed
- Reverts automatically if save fails

✅ **User Experience**
- Cursor changes to indicate draggable elements
- Categories maintain all existing functionality (edit, delete, toggle status)
- Click on category content still navigates to products

✅ **Performance Optimized**
- Database index on `display_order` column
- Efficient batch updates
- Optimistic UI updates

## Technical Details

### Database Schema
```sql
categories {
  id: uuid (primary key)
  name: text
  description: text
  image_url: text
  is_active: boolean
  display_order: integer  -- NEW FIELD
  created_at: timestamp
  updated_at: timestamp
}
```

### API Endpoint
**POST** `/api/categories/reorder`

**Request Body:**
```json
{
  "categories": [
    { "id": "uuid-1", "name": "Category 1", ... },
    { "id": "uuid-2", "name": "Category 2", ... }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

### Query Order
Categories are now fetched with the following order:
1. Primary: `display_order` (ascending)
2. Fallback: `created_at` (descending)

This ensures newly created categories without a display_order value appear at the end.

## Updating Your User-Facing Application

To ensure the category order is reflected in your user-facing application, update any category fetching queries to include:

```typescript
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .order('display_order', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false });
```

## Troubleshooting

### Issue: Drag and drop not working
**Solution:** Ensure the migration has been run and the `display_order` column exists.

### Issue: Order not persisting
**Solution:** Check browser console for API errors. Verify the API route is accessible at `/api/categories/reorder`.

### Issue: Categories not showing correct order after page refresh
**Solution:** Verify the SQL query includes `.order('display_order', { ascending: true })`.

### Issue: New categories appear in wrong position
**Solution:** Ensure new category creation sets an appropriate `display_order` value (e.g., max + 1).

## Future Enhancements

Possible future improvements:
- Add visual indicators showing the drop zone
- Implement bulk reordering tools
- Add "Reset to default order" button
- Enable keyboard shortcuts for reordering
- Add undo/redo functionality

## Support

For issues or questions, please refer to the documentation for:
- [dnd-kit](https://docs.dndkit.com/)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

