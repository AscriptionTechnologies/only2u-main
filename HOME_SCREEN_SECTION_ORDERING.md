# Mobile App Home Screen Section Ordering

## Overview

Control the **order of sections** on your mobile app home screen! Drag and drop to decide whether Best Sellers, Trending, or Categories appear first.

---

## 🎯 What This Does

### Control Section Order

You can now set which sections appear first on the mobile app home screen:
- **⭐ Best Sellers** section
- **🔥 Trending Now** section
- **📦 Categories** section

Simply drag them into your preferred order!

### Example Scenarios

**Scenario 1:**
```
Order: Best Sellers → Trending → Categories
Mobile app shows Best Sellers first, then Trending, then Categories
```

**Scenario 2:**
```
Order: Trending → Best Sellers → Categories
Mobile app shows Trending first, then Best Sellers, then Categories
```

**Scenario 3:**
```
Order: Categories → Best Sellers → Trending
Mobile app shows Categories first, then others below
```

---

## 🚀 Quick Setup

### Step 1: Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- migrations/005_create_feature_type_ordering.sql
```

This creates:
- `feature_sections` table
- Default sections (Best Sellers, Trending, Categories)
- Display order management

### Step 2: Use the Feature

1. Go to **Inventory Management**
2. Click **"Home Screen Order"** tab (new!)
3. **Drag** sections to reorder
4. Order saves automatically!

**✅ Done! Mobile app will show sections in your order.**

---

## 🎨 Admin Panel UI

### Three Tabs in Inventory Management

```
┌──────────────────────────────────────────────────┐
│  Inventory Management                             │
├──────────────────────────────────────────────────┤
│  [Categories] [Home Screen Order] [Featured Products]│
│                ─────────────────                  │
└──────────────────────────────────────────────────┘
```

### Home Screen Order View

```
┌──────────────────────────────────────────────────┐
│  📱 Mobile App Home Screen Order                  │
│  Drag sections to control order in mobile app    │
│                                                  │
│  Current: 1. Best Sellers → 2. Trending → 3. Categories│
├──────────────────────────────────────────────────┤
│  Drag to Reorder Home Screen Sections            │
│                                                  │
│  ≡  ⭐  Best Sellers                [Hide]      │
│  ≡  🔥  Trending Now                [Hide]      │
│  ≡  📦  Shop by Category            [Hide]      │
└──────────────────────────────────────────────────┘
```

### Section Cards

Each section card shows:
- **Drag handle** (≡) - Grab to reorder
- **Icon** - Visual identifier (⭐🔥📦)
- **Title** - Section name
- **Description** - What it shows
- **Position** - Current position number
- **Status** - Active or Hidden
- **Toggle button** - Hide/Show section

---

## 🎯 How to Use

### Reorder Sections

1. **Go to** Inventory Management
2. **Click** "Home Screen Order" tab
3. **Grab** the ≡ handle on any section
4. **Drag** to new position
5. **Drop** to save
6. **Done!** Order updates in mobile app

### Hide/Show Sections

- Click **"Hide"** button to remove section from mobile app
- Click **"Show"** button to display section in mobile app
- Hidden sections don't appear in mobile app home screen

---

## 📱 Mobile App Integration

### Fetch Sections in Order

```typescript
// Fetch sections with their order
const { data: sections } = await supabase
  .from('feature_sections')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true });

// Build home screen based on section order
sections.forEach(async (section) => {
  if (section.section_type === 'best_seller') {
    const bestSellers = await fetchBestSellers();
    renderSection('Best Sellers', bestSellers);
  }
  else if (section.section_type === 'trending') {
    const trending = await fetchTrending();
    renderSection('Trending Now', trending);
  }
  else if (section.section_type === 'categories') {
    const categories = await fetchCategories();
    renderCategoriesSection(categories);
  }
});
```

### Complete Home Screen Implementation

```typescript
// HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { supabase } from './supabase';

export default function HomeScreen() {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetchHomeScreenSections();
  }, []);

  async function fetchHomeScreenSections() {
    // Fetch section order configuration
    const { data: sectionConfig } = await supabase
      .from('feature_sections')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!sectionConfig) return;

    // Build sections based on configuration
    const homeSections = [];

    for (const config of sectionConfig) {
      if (config.section_type === 'best_seller') {
        // Fetch best sellers
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('featured_type', 'best_seller')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        homeSections.push({
          type: 'products',
          title: config.title,
          icon: config.icon,
          data: products || []
        });
      }
      else if (config.section_type === 'trending') {
        // Fetch trending
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('featured_type', 'trending')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        homeSections.push({
          type: 'products',
          title: config.title,
          icon: config.icon,
          data: products || []
        });
      }
      else if (config.section_type === 'categories') {
        // Fetch categories
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true, nullsFirst: false });

        homeSections.push({
          type: 'categories',
          title: config.title,
          icon: config.icon,
          data: categories || []
        });
      }
    }

    setSections(homeSections);
  }

  return (
    <ScrollView>
      {sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {section.icon} {section.title}
          </Text>
          
          {section.type === 'products' ? (
            <ProductsList products={section.data} />
          ) : (
            <CategoriesGrid categories={section.data} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
```

---

## ✨ Features

### 1. **Drag-and-Drop Reordering**
- Visual drag handles
- Smooth animations
- Auto-save on drop
- Instant feedback

### 2. **Section Visibility Control**
- Hide/show entire sections
- Hidden sections don't appear in app
- Easy toggle buttons

### 3. **Visual Preview**
- See current order at top
- Color-coded sections
- Position numbers
- Status indicators

### 4. **Automatic Sync**
- Changes save to database immediately
- Mobile app fetches on next refresh
- No manual deployment needed

---

## 🎯 Use Cases

### Use Case 1: Promote Best Sellers First

```
Admin Action:
1. Go to Home Screen Order
2. Drag "Best Sellers" to position #1
3. Drag "Trending" to position #2
4. Drag "Categories" to position #3

Mobile App Result:
Home screen shows:
1. ⭐ Best Sellers (top)
2. 🔥 Trending Now
3. 📦 Categories
```

### Use Case 2: Focus on Trending Items

```
Admin Action:
1. Drag "Trending Now" to #1
2. Drag "Best Sellers" to #2
3. Categories stay at #3

Mobile App Result:
1. 🔥 Trending Now (top)
2. ⭐ Best Sellers
3. 📦 Categories
```

### Use Case 3: Hide a Section Temporarily

```
Admin Action:
1. Click "Hide" on "Trending Now"
2. Only Best Sellers and Categories remain active

Mobile App Result:
1. ⭐ Best Sellers
2. 📦 Categories
(Trending section not shown)
```

---

## 📊 Default Order (After Migration)

```
Position 0: ⭐ Best Sellers
Position 1: 🔥 Trending Now
Position 2: 📦 Shop by Category
```

Mobile app shows Best Sellers first (as you requested!).

---

## 🎨 Visual Design

### Section Cards

**Color Coding:**
- **Best Sellers** - Purple (`bg-purple-100`)
- **Trending** - Blue (`bg-blue-100`)
- **Categories** - Green (`bg-green-100`)

**Card Elements:**
```
┌─────────────────────────────────────────┐
│ ≡  ⭐  Best Sellers          [Hide]    │
│      Products marked as Best Sellers   │
│      Position: #1  Active              │
└─────────────────────────────────────────┘
      ↑    ↑         ↑          ↑
   Drag  Icon    Title      Toggle
```

---

## 🔄 Complete Workflow

### Admin Sets Order

```
1. Admin analyzes what to promote
2. Goes to Inventory Management
3. Clicks "Home Screen Order" tab
4. Sees current section order
5. Drags sections to desired order
6. Order saves automatically to database
```

### Mobile App Displays

```
1. App opens/refreshes home screen
2. Fetches feature_sections table
3. Sorts by display_order ASC
4. Filters only is_active = true
5. Renders sections in fetched order
6. User sees admin-configured order
```

---

## 📋 Database Structure

### `feature_sections` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| section_type | VARCHAR | best_seller, trending, categories |
| display_order | INTEGER | Position (0, 1, 2) |
| is_active | BOOLEAN | Show/hide in app |
| title | VARCHAR | Display name |
| description | TEXT | Section description |
| icon | VARCHAR | Emoji icon |

### Default Data

```sql
section_type  | display_order | title                | icon
--------------|---------------|---------------------|------
best_seller   | 0             | Best Sellers        | ⭐
trending      | 1             | Trending Now        | 🔥
categories    | 2             | Shop by Category    | 📦
```

---

## 💡 Advanced Scenarios

### Scenario 1: Seasonal Changes

```
Winter Season:
- Best Sellers #1 (winter products)
- Categories #2
- Trending #3 (hide if not relevant)

Summer Season:
- Trending #1 (summer products)
- Best Sellers #2
- Categories #3
```

### Scenario 2: Sales Event

```
During Sale:
- Trending #1 (sale items marked trending)
- Best Sellers #2
- Categories #3

After Sale:
- Reorder back to normal
```

### Scenario 3: New Store Launch

```
First Month:
- Categories #1 (help customers browse)
- Trending #2 (new arrivals)
- Hide Best Sellers (not enough data yet)

After 3 Months:
- Best Sellers #1 (now have data)
- Trending #2
- Categories #3
```

---

## 🧪 Testing

### Test 1: Reorder Sections

1. Go to Inventory Management
2. Click "Home Screen Order" tab
3. Drag "Trending Now" to top
4. Should see:
   - Position updated to #1
   - Preview shows new order
5. Refresh page
6. ✅ Success if order persists

### Test 2: Hide Section

1. Click "Hide" on "Trending Now"
2. Status should change to "Hidden"
3. Preview should only show active sections
4. ✅ Success if status updates

### Test 3: Mobile App Reflection

1. Set order in admin panel
2. Open mobile app
3. Pull to refresh or restart app
4. ✅ Success if mobile app matches admin order

---

## 📱 Mobile App Query Example

### Simple Approach

```typescript
// Fetch sections in order
const { data: sections } = await supabase
  .from('feature_sections')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true });

// Render each section
for (const section of sections) {
  switch (section.section_type) {
    case 'best_seller':
      await renderBestSellersSection();
      break;
    case 'trending':
      await renderTrendingSection();
      break;
    case 'categories':
      await renderCategoriesSection();
      break;
  }
}
```

---

## 🎓 Best Practices

### When to Reorder

✅ **Seasonal changes** - Promote seasonal items  
✅ **Sales events** - Highlight sale sections  
✅ **New launches** - Feature new products  
✅ **Performance data** - Based on analytics  
✅ **Customer feedback** - Based on user behavior  

### Section Visibility

✅ **Always show Categories** - Helps navigation  
✅ **Hide if empty** - Don't show empty sections  
✅ **Seasonal hiding** - Hide off-season sections  
✅ **Test before hiding** - Ensure app still works  

---

## 🔧 Technical Details

### API Endpoint

**POST** `/api/feature-sections/reorder`

```json
{
  "sections": [
    {
      "id": "uuid-1",
      "section_type": "trending",
      "display_order": 0,
      ...
    },
    {
      "id": "uuid-2",
      "section_type": "best_seller",
      "display_order": 1,
      ...
    }
  ]
}
```

### Mobile App Query

```sql
SELECT * FROM feature_sections
WHERE is_active = true
ORDER BY display_order ASC;
```

---

## ✅ Summary

### What You Can Do

✨ **Reorder sections** - Drag and drop  
✨ **Hide sections** - Toggle visibility  
✨ **Preview order** - See before deploying  
✨ **Control mobile app** - Directly from admin  

### How to Use

1. Click "Home Screen Order" tab
2. Drag sections to reorder
3. Toggle hide/show as needed
4. Done!

### Mobile App Impact

📱 Sections appear in your set order  
📱 Hidden sections don't appear  
📱 Updates on next app refresh  
📱 No app update needed  

---

## 🎉 Ready to Use!

**Setup:** Run one migration (Step 1)  
**Usage:** Drag sections in "Home Screen Order" tab  
**Result:** Mobile app reflects your order  

Happy ordering! 📱✨

