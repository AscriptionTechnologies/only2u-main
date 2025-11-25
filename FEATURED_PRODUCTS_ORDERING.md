# Featured Products & Categories Drag-and-Drop Ordering

## Overview

You can now **drag-and-drop to reorder**:
1. ✅ **Categories** - In the Categories view
2. ✅ **Best Seller products** - In Featured Products view
3. ✅ **Trending products** - In Featured Products view

The order you set in the admin panel will be **reflected in the mobile app** automatically!

---

## 🎯 What Was Implemented

### 1. **Categories Ordering** (Already Exists)
- Drag-and-drop categories
- Order saved to `display_order` column
- Mobile app shows in same order

### 2. **Featured Products Ordering** (New!)
- Drag-and-drop best sellers
- Drag-and-drop trending items
- Order saved to `display_order_within_feature` column
- Mobile app shows in same order

---

## 🚀 Quick Setup

### Step 1: Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- migrations/004_add_product_display_order.sql
```

This adds:
- `display_order` column to products table
- `display_order_within_feature` column for featured products
- Indexes for performance
- Auto-initialization for existing products

### Step 2: Use It!

1. Go to **Inventory Management**
2. Click **"Featured Products"** tab
3. Click filter: **"🔥 Trending Now"** or **"⭐ Best Sellers"**
4. **Drag** products using the ≡ handle
5. Order saves automatically!

**✅ That's it! Works immediately.**

---

## 📱 Mobile App Integration

### Fetch Categories in Order

```typescript
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false });

// Display in home screen
categories.forEach(category => {
  renderCategory(category);
});
```

### Fetch Best Sellers in Order

```typescript
const { data: bestSellers } = await supabase
  .from('products')
  .select('*')
  .eq('featured_type', 'best_seller')
  .eq('is_active', true)
  .order('display_order_within_feature', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false })
  .limit(10);

// Display in home screen
<Section title="Best Sellers">
  {bestSellers.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</Section>
```

### Fetch Trending Items in Order

```typescript
const { data: trending } = await supabase
  .from('products')
  .select('*')
  .eq('featured_type', 'trending')
  .eq('is_active', true)
  .order('display_order_within_feature', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false })
  .limit(10);

// Display in home screen
<Section title="Trending Now">
  {trending.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</Section>
```

### Complete Home Screen Example

```typescript
// HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { supabase } from './supabase';

export default function HomeScreen() {
  const [bestSellers, setBestSellers] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchHomeData();
  }, []);

  async function fetchHomeData() {
    // Fetch best sellers (in order set by admin)
    const { data: bestSellersData } = await supabase
      .from('products')
      .select('*')
      .eq('featured_type', 'best_seller')
      .eq('is_active', true)
      .order('display_order_within_feature', { ascending: true, nullsFirst: false })
      .limit(10);

    // Fetch trending (in order set by admin)
    const { data: trendingData } = await supabase
      .from('products')
      .select('*')
      .eq('featured_type', 'trending')
      .eq('is_active', true)
      .order('display_order_within_feature', { ascending: true, nullsFirst: false })
      .limit(10);

    // Fetch categories (in order set by admin)
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false });

    setBestSellers(bestSellersData || []);
    setTrending(trendingData || []);
    setCategories(categoriesData || []);
  }

  return (
    <ScrollView>
      {/* Best Sellers Section - Shows FIRST as per your requirement */}
      <ProductSection 
        title="⭐ Best Sellers" 
        products={bestSellers} 
      />

      {/* Trending Section - Shows SECOND */}
      <ProductSection 
        title="🔥 Trending Now" 
        products={trending} 
      />

      {/* Categories Section - Shows in admin-set order */}
      <CategorySection 
        title="Shop by Category" 
        categories={categories} 
      />

      {/* Other sections... */}
    </ScrollView>
  );
}
```

---

## 🎨 Admin Panel UI

### Inventory Management - Two Views

**View 1: Categories** (with drag-and-drop)
```
┌────────────────────────────────────┐
│  [Categories 8] [Featured Products]│
│  ─────────────                     │
│                                    │
│  ≡  📷 Clothing                    │
│  ≡  📷 Footwear                    │
│  ≡  📷 Accessories                 │
└────────────────────────────────────┘
```

**View 2: Featured Products** (with drag-and-drop)
```
┌────────────────────────────────────┐
│  [Categories] [Featured Products]  │
│               ──────────────────   │
│                                    │
│  [All Featured] [🔥 Trending] [⭐ Best Sellers]│
│                                    │
│  ⬍  Drag to reorder - reflects in app │
│                                    │
│  ≡  T-Shirt    Clothing  [Trending▼] Edit│
│  ≡  Jeans      Clothing  [Best▼]     Edit│
│  ≡  Sneakers   Footwear  [Best▼]     Edit│
└────────────────────────────────────┘
```

---

## ⭐ Key Features

### 1. **Separate Ordering per Feature Type**
- Best Sellers have their own order (1, 2, 3...)
- Trending items have their own order (1, 2, 3...)
- Categories have their own order
- Each maintains independent ordering

### 2. **Visual Drag Handles**
- ≡ icon shows on hover
- Cursor changes to "grab"
- Smooth drag animations
- Visual feedback (opacity)

### 3. **Auto-Save**
- Order saves immediately on drop
- No manual save button
- Updates database automatically
- Reflects in mobile app

### 4. **Filter-Specific Ordering**
- When filtering "Trending" - drag to order trending items
- When filtering "Best Sellers" - drag to order best sellers
- When filtering "All Featured" - can still drag (saves to display_order_within_feature)

---

## 🔄 How It Works

### Admin Sets Order

```
Admin Panel (Inventory Management)
        ↓
Click "Featured Products" tab
        ↓
Click "Best Sellers" filter
        ↓
Drag products to desired order
        ↓
Order saved to database
(display_order_within_feature: 0, 1, 2, 3...)
```

### Mobile App Shows Order

```
Mobile App Home Screen
        ↓
Fetch best sellers
ORDER BY display_order_within_feature ASC
        ↓
Display in fetched order
        ↓
Customer sees products in admin-set order
```

---

## 💡 Use Cases

### Use Case 1: Promote New Best Seller

```
Scenario: New product becomes best seller

Admin Action:
1. Go to Featured Products → Best Sellers
2. Find the new product
3. Drag it to position #1 (top)
4. Done!

Mobile App Result:
- New product appears first in Best Sellers
- Other products shift down
```

### Use Case 2: Seasonal Trending Order

```
Scenario: Summer items should be first in Trending

Admin Action:
1. Go to Featured Products → Trending Now
2. Drag summer items to top positions
3. Drag winter items to bottom
4. Order saves automatically

Mobile App Result:
- Summer items show first in Trending
- Winter items show last
- Customers see seasonal products first
```

### Use Case 3: Category Hierarchy

```
Scenario: Want "New Arrivals" category shown first

Admin Action:
1. Go to Inventory Management → Categories
2. Drag "New Arrivals" to top
3. Arrange other categories below

Mobile App Result:
- "New Arrivals" shows first on home screen
- Other categories in admin-set order
```

---

## 📊 Database Schema

### Products Table

```sql
-- Existing columns
id, name, description, category_id, featured_type, is_active, created_at, updated_at

-- New columns
display_order                  INTEGER  -- Overall product order
display_order_within_feature   INTEGER  -- Order within feature type (trending/best_seller)
```

### Categories Table

```sql
-- Existing columns
id, name, description, image_url, is_active, created_at

-- Already has
display_order  INTEGER  -- Category order
```

---

## 🎯 Ordering Logic

### Categories

```sql
SELECT * FROM categories
WHERE is_active = true
ORDER BY display_order ASC NULLS LAST,
         created_at DESC;
```

**Result:** Categories show in drag-and-drop order

### Best Sellers

```sql
SELECT * FROM products
WHERE featured_type = 'best_seller'
  AND is_active = true
ORDER BY display_order_within_feature ASC NULLS LAST,
         created_at DESC
LIMIT 10;
```

**Result:** Best sellers show in drag-and-drop order

### Trending Items

```sql
SELECT * FROM products
WHERE featured_type = 'trending'
  AND is_active = true
ORDER BY display_order_within_feature ASC NULLS LAST,
         created_at DESC
LIMIT 10;
```

**Result:** Trending items show in drag-and-drop order

---

## 🎨 User Interface Details

### Drag Handles

**Categories:**
- Left side of each category card
- ≡ icon (horizontal lines)
- Shows "Drag to reorder" on hover

**Featured Products:**
- First column in table
- ≡ icon (horizontal lines)
- Shows "Drag to reorder" on hover
- Blue info banner at top of table

### Color Coding

**Feature Type Badges:**
- 🔥 **Trending** - Blue background
- ⭐ **Best Seller** - Purple background
- **None** - Gray background

### Animations

- Smooth drag movement
- Opacity reduces while dragging
- Snap to position on drop
- Visual feedback

---

## 🧪 Testing Guide

### Test 1: Reorder Best Sellers

1. Go to Inventory Management
2. Click "Featured Products" tab
3. Click "⭐ Best Sellers" filter
4. Drag a product from bottom to top
5. Refresh page
6. ✅ Success if order persists

### Test 2: Reorder Trending

1. Click "🔥 Trending Now" filter
2. Drag products to new positions
3. Refresh page
4. ✅ Success if order persists

### Test 3: Reorder Categories

1. Click "Categories" tab
2. Drag categories to new order
3. Refresh page
4. ✅ Success if order persists

### Test 4: Mobile App Reflection

1. Set order in admin panel
2. Open mobile app
3. Pull to refresh or restart app
4. ✅ Success if mobile app shows same order

---

## 📱 Mobile App Implementation

### Home Screen Layout (Your Requirement)

```
Mobile App Home Screen:

┌─────────────────────────────┐
│  🏠 Home                     │
├─────────────────────────────┤
│                             │
│  ⭐ Best Sellers  (FIRST)   │
│  ┌───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │  ← Admin order │
│  └───┴───┴───┴───┘         │
│                             │
│  🔥 Trending Now (SECOND)   │
│  ┌───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │  ← Admin order │
│  └───┴───┴───┴───┘         │
│                             │
│  📦 Categories (THIRD)      │
│  ┌─────────┬─────────┐     │
│  │Category1│Category2│ ← Admin order│
│  ├─────────┼─────────┤     │
│  │Category3│Category4│     │
│  └─────────┴─────────┘     │
└─────────────────────────────┘
```

---

## 🎯 Workflow Examples

### Example 1: Set Best Sellers Order

```
Admin Panel:
1. Inventory Management → Featured Products
2. Click "Best Sellers" filter
3. See current best sellers:
   - Product A
   - Product B
   - Product C
4. Drag Product C to top
5. New order:
   - Product C (position 0)
   - Product A (position 1)
   - Product B (position 2)

Mobile App Result:
Best Sellers Section shows:
1. Product C (first)
2. Product A (second)
3. Product B (third)
```

### Example 2: Set Trending Order

```
Admin Panel:
1. Click "Trending Now" filter
2. Current trending:
   - Summer Dress
   - Beach Sandals
   - Sunglasses
3. Promote "Sunglasses" to #1
4. Drag Sunglasses to top

Mobile App Result:
Trending Now Section shows:
1. Sunglasses (first)
2. Summer Dress (second)
3. Beach Sandals (third)
```

### Example 3: Category Order (Already Working)

```
Admin Panel:
1. Click "Categories" tab
2. Drag "New Arrivals" to top
3. Drag "Sale" to second
4. Other categories below

Mobile App Result:
Categories show:
1. New Arrivals
2. Sale
3. [Other categories in order]
```

---

## 🔧 Technical Details

### Database Columns

**Categories:**
```sql
display_order INTEGER -- Position in category list
```

**Products:**
```sql
display_order                INTEGER -- Overall product position
display_order_within_feature INTEGER -- Position within feature type
```

### Why Two Columns for Products?

1. `display_order` - For general product ordering (future use)
2. `display_order_within_feature` - For featured products ordering

**Best sellers** have their own sequence: 0, 1, 2, 3...  
**Trending** has its own sequence: 0, 1, 2, 3...

This keeps them independent!

### Query Examples

**Best Sellers (Ordered):**
```sql
SELECT * FROM products
WHERE featured_type = 'best_seller'
  AND is_active = true
ORDER BY display_order_within_feature ASC,
         created_at DESC;
```

**Trending (Ordered):**
```sql
SELECT * FROM products
WHERE featured_type = 'trending'
  AND is_active = true
ORDER BY display_order_within_feature ASC,
         created_at DESC;
```

**Categories (Ordered):**
```sql
SELECT * FROM categories
WHERE is_active = true
ORDER BY display_order ASC,
         created_at DESC;
```

---

## 🎨 Visual Design

### Drag-and-Drop Indicators

**Before Drag:**
```
┌──────────────────────────────┐
│  ≡  Product Name   Category  │
│  ≡  Product Name   Category  │
│  ≡  Product Name   Category  │
└──────────────────────────────┘
     ↑
   Drag handle (visible on hover)
```

**During Drag:**
```
┌──────────────────────────────┐
│  ≡  Product Name   Category  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Semi-transparent
│  ≡  Product Name   Category  │
│  ≡  Product Name   Category  │
└──────────────────────────────┘
```

**After Drop:**
```
┌──────────────────────────────┐
│  ≡  Product Name   Category  │ ← New position
│  ≡  Product Name   Category  │
│  ≡  Product Name   Category  │
└──────────────────────────────┘
```

### Info Banner

Blue banner at top of Featured Products table:
```
┌──────────────────────────────────────────────┐
│  ⬍  Drag products to reorder them.           │
│     This order will be reflected in the      │
│     mobile app.                              │
└──────────────────────────────────────────────┘
```

---

## ✅ Benefits

### For Admins

✅ **Full control** - Set exact order shown in app  
✅ **Easy management** - Drag-and-drop interface  
✅ **Visual feedback** - See changes immediately  
✅ **No coding** - No need to update mobile app  
✅ **Flexibility** - Change order anytime  

### For Mobile App

✅ **Automatic updates** - Just use ORDER BY  
✅ **Consistent experience** - Admin controls order  
✅ **No hardcoding** - Dynamic ordering from database  
✅ **Performance** - Indexed queries are fast  

### For Business

✅ **Strategic placement** - Promote products intentionally  
✅ **A/B testing** - Try different orders  
✅ **Seasonal changes** - Update for seasons/events  
✅ **Data-driven** - Order by performance metrics  

---

## 🎓 Best Practices

### For Best Sellers

✅ **Update weekly** - Based on sales data  
✅ **Promote top 10** - Don't overwhelm customers  
✅ **Mix categories** - Variety keeps interest  
✅ **Track clicks** - Monitor if position matters  

### For Trending

✅ **Update frequently** - Keep fresh and relevant  
✅ **Seasonal items first** - Timely products on top  
✅ **New arrivals** - Promote new products  
✅ **Rotate regularly** - Weekly or bi-weekly changes  

### For Categories

✅ **Logical grouping** - Related categories together  
✅ **Popular first** - High-traffic categories on top  
✅ **Seasonal adjustment** - Promote season categories  
✅ **Test and optimize** - Track which order works best  

---

## 🔄 Complete Workflow

### Admin Workflow

```
1. Analyze sales/traffic data
2. Decide on product/category order
3. Go to Inventory Management
4. Choose view (Categories or Featured Products)
5. Choose filter (for featured products)
6. Drag items to desired order
7. Order saves automatically
8. Changes reflect in mobile app
```

### Customer Experience

```
1. Opens mobile app
2. Sees home screen
3. Best Sellers section (admin-ordered)
4. Trending section (admin-ordered)
5. Categories (admin-ordered)
6. Shops based on curated order
```

---

## 📊 Example Order Strategy

### Morning of Product Launch

```
Best Sellers:
1. New Launch Product (drag to #1)
2. Previous best seller
3-10. Other top products

Trending:
1. New Launch Product (also #1 here)
2. Related items
3-10. Other trending

Categories:
1. New Arrivals (has the launch product)
2. Other categories
```

### Weekly Update Based on Data

```
Monday Morning Review:

Check Analytics:
- Top 10 best selling items

Update Best Sellers:
1. Drag top sellers to top positions
2. Remove slow movers to bottom or remove feature

Update Trending:
1. Add new viral products
2. Remove old trends
3. Reorder based on social media buzz
```

---

## 🐛 Troubleshooting

### Drag-and-drop not working

**Solution:**
1. Run migration `004_add_product_display_order.sql`
2. Refresh admin panel
3. Check browser console for errors

### Order not persisting

**Solution:**
1. Check network tab - verify API call succeeds
2. Refresh page - should maintain order
3. Check database - verify display_order_within_feature updated

### Mobile app not showing order

**Solution:**
1. Verify query includes `ORDER BY display_order_within_feature ASC`
2. Check mobile app refreshes data properly
3. Verify database migration ran successfully

### Products jumping back

**Solution:**
1. Check API endpoint `/api/products/reorder-featured` is accessible
2. Check Supabase permissions
3. Verify no errors in browser console

---

## 📚 Documentation

### Quick Reference
- **`FEATURED_PRODUCTS_ORDERING.md`** ← This file
- **`FEATURED_PRODUCTS_FILTER.md`** ← Feature type filtering
- **`CATEGORY_REORDERING_FEATURE.md`** ← Category reordering

### Migration
- **`migrations/004_add_product_display_order.sql`** ← Database setup

---

## ✅ Summary

### What You Can Reorder

1. ✅ **Categories** - Drag in Categories view
2. ✅ **Best Sellers** - Drag in Featured Products → Best Sellers
3. ✅ **Trending Items** - Drag in Featured Products → Trending

### How Mobile App Shows

```
Home Screen (Top to Bottom):
1. ⭐ Best Sellers (in admin drag-and-drop order)
2. 🔥 Trending Now (in admin drag-and-drop order)
3. 📦 Categories (in admin drag-and-drop order)
```

### Setup Required

1. ✅ Run migration (`004_add_product_display_order.sql`)
2. ✅ Update mobile app queries (add ORDER BY)
3. ✅ Test drag-and-drop in admin
4. ✅ Verify in mobile app

---

## 🎉 Ready to Use!

**Admin Panel:** Fully functional drag-and-drop for all three!

**Mobile App:** Just update queries to include ORDER BY clauses (see Mobile App Integration section)

**No other changes needed!**

---

Happy ordering! ⭐🔥📦✨

