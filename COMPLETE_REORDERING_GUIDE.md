# Complete Guide to Reordering System - Mobile App Layout Control

## 📱 Introduction

This admin panel allows you to **control the layout and order** of content on the mobile app home screen through a simple drag-and-drop interface. You can reorder sections and categories to create the perfect shopping experience for your customers.

---

## 🎯 What You Can Control

### 1. **Home Screen Section Order**
Control which major sections appear first on the mobile app home screen:
- ⭐ **Best Sellers** section
- 🔥 **Trending Now** section
- 📦 **Categories** section

### 2. **Category Order**
Control the order in which product categories appear within the Categories section.

---

## 🚀 Complete Step-by-Step Guide

### PART 1: Setting Up Home Screen Section Order

This controls whether Best Sellers, Trending, or Categories appears first on the mobile app home screen.

#### Step 1: Access the Section Ordering Page

1. **Log in** to the admin panel
2. Click **"Inventory Management"** in the left sidebar
3. You'll see **three tabs** at the top:
   - Categories
   - **Home Screen Order** ← Click this!
   - Featured Products

#### Step 2: Understand the Current Order

You'll see:
- **Info box at top** showing current order preview
- **Three large colored cards:**
  - 🟣 Purple card = **Best Sellers** section
  - 🔵 Blue card = **Trending Now** section
  - 🟢 Green card = **Categories** section

Each card shows:
- Section icon and title
- Description of what it contains
- Current position number (Position: #1, #2, #3)
- Status (Active or Hidden)
- Hide/Show button

#### Step 3: Reorder the Sections

**To change which section appears first:**

1. **Find the section** you want to move (e.g., "Trending Now")
2. **Click and hold** the ≡ (three horizontal lines) icon on the left side of the card
3. **Drag** the card up or down
4. **Release** to drop it in the new position
5. **Done!** The order saves automatically

**Example:**
- If you want Trending to appear first:
  - Drag the blue "Trending Now" card to the top
  - It becomes Position #1
  - Best Sellers shifts to Position #2
  - Categories stays at Position #3

#### Step 4: Hide/Show Sections (Optional)

If you don't want a section to appear in the mobile app:

1. Click the **"Hide"** button on that section's card
2. The section will be hidden from the mobile app
3. It will show "Hidden" status
4. Click **"Show"** to make it visible again

**Note:** Hiding a section removes it from the mobile app entirely. Use this if you don't have enough content for a section yet.

---

### PART 2: Reordering Categories

This controls the order of product categories (like Clothing, Footwear, Accessories) within the Categories section.

#### Step 1: Access Categories View

1. In **Inventory Management**, click the **"Categories"** tab
2. You'll see all your product categories

#### Step 2: Reorder Categories

1. **Find the category** you want to move
2. **Click and hold** the ≡ icon on the left side
3. **Drag** the category card up or down
4. **Release** to drop
5. **Done!** Order saves automatically

**Example:**
- If you want "New Arrivals" to show first:
  - Drag "New Arrivals" to the top
  - Other categories shift down
  - Mobile app now shows "New Arrivals" first in the categories grid

---

## 📱 How It Reflects in the Mobile App

### Mobile App Home Screen Layout

```
┌─────────────────────────────────┐
│  🏠 Home                         │
├─────────────────────────────────┤
│                                 │
│  [Section that's #1 in admin]   │
│  ┌────┬────┬────┬────┐         │
│  │    │    │    │    │         │
│  └────┴────┴────┴────┘         │
│                                 │
│  [Section that's #2 in admin]   │
│  ┌────┬────┬────┬────┐         │
│  │    │    │    │    │         │
│  └────┴────┴────┴────┘         │
│                                 │
│  [Section that's #3 in admin]   │
│  ┌────┬────┬────┬────┐         │
│  │    │    │    │    │         │
│  └────┴────┴────┴────┘         │
└─────────────────────────────────┘
```

### Default Order (What You Requested)

By default, the mobile app shows:
1. **⭐ Best Sellers** (first/top)
2. **🔥 Trending Now** (second)
3. **📦 Categories** (third)

### After Reordering Example

If you drag Trending to #1:
1. **🔥 Trending Now** (first/top)
2. **⭐ Best Sellers** (second)
3. **📦 Categories** (third)

---

## 🎯 Common Scenarios & How to Handle Them

### Scenario 1: "I want Trending Items to appear first"

**Steps:**
1. Go to: Inventory Management → **Home Screen Order** tab
2. Find the **blue "Trending Now"** card
3. Drag it to the **top** (above Best Sellers)
4. Done!

**Mobile App Result:**
- Trending Now section appears first
- Best Sellers appears second
- Categories appears third

---

### Scenario 2: "I want to change category order (e.g., New Arrivals first)"

**Steps:**
1. Go to: Inventory Management → **Categories** tab
2. Find the **"New Arrivals"** category
3. Drag it to the **top**
4. Arrange other categories below
5. Done!

**Mobile App Result:**
- Categories section shows "New Arrivals" first
- Other categories in your set order

---

### Scenario 3: "I want to hide the Trending section temporarily"

**Steps:**
1. Go to: Inventory Management → **Home Screen Order** tab
2. Find the **blue "Trending Now"** card
3. Click the **"Hide"** button
4. Done!

**Mobile App Result:**
- Best Sellers section (still shows)
- Categories section (still shows)
- Trending Now section (hidden/removed)

---

### Scenario 4: "For a sale event, I want Best Sellers first, then Categories"

**Steps:**
1. Go to: **Home Screen Order** tab
2. Ensure **Best Sellers** is at position #1 (drag if needed)
3. Drag **Categories** to position #2
4. Click **"Hide"** on **Trending Now** (optional)
5. Done!

**Mobile App Result:**
- Best Sellers (first) - showcase sale items
- Categories (second) - easy browsing
- Trending hidden (focused on sale)

---

## 🎨 Visual Guide to the Admin Interface

### Home Screen Order View

```
┌──────────────────────────────────────────────────────┐
│  Inventory Management                                 │
│                                                       │
│  [Categories] [Home Screen Order] [Featured Products]│
│                ─────────────────                     │
├──────────────────────────────────────────────────────┤
│  📱 Mobile App Home Screen Order                     │
│  Drag and drop sections to control order             │
│                                                       │
│  Current Order: 1. Best Sellers → 2. Trending → 3. Categories│
├──────────────────────────────────────────────────────┤
│  Drag to Reorder Home Screen Sections                │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  ⭐  Best Sellers              [Hide]        │ │
│  │      Products marked as Best Sellers           │ │
│  │      Position: #1  Active                      │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  🔥  Trending Now              [Hide]        │ │
│  │      Products marked as Trending Now           │ │
│  │      Position: #2  Active                      │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  📦  Shop by Category          [Hide]        │ │
│  │      All product categories                    │ │
│  │      Position: #3  Active                      │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Categories View

```
┌──────────────────────────────────────────────────────┐
│  Inventory Management                                 │
│                                                       │
│  [Categories] [Home Screen Order] [Featured Products]│
│  ─────────────                                       │
├──────────────────────────────────────────────────────┤
│  [+ Add Category]                                    │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  📷 Clothing                    [Edit] [Del] │ │
│  │    Apparel and clothing items                  │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  📷 Footwear                    [Edit] [Del] │ │
│  │    Shoes and footwear                          │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ ≡  📷 Accessories                 [Edit] [Del] │ │
│  │    Fashion accessories                         │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 📋 Quick Action Reference

### What the Drag Handle Looks Like

```
≡  ← This is the drag handle (three horizontal lines)
```

When you hover over it:
- Cursor changes to a hand/grab cursor
- You can click and drag

### What Each Button Does

**In Home Screen Order:**
- **Hide button** - Removes section from mobile app
- **Show button** - Displays section in mobile app

**In Categories:**
- **Edit button** - Modify category details
- **Delete button** - Remove category
- **Activate/Deactivate** - Toggle category visibility

---

## 🔄 Complete Workflow Examples

### Example 1: Setting Up for Holiday Sale

**Goal:** Promote Best Sellers with sale items first, hide Trending

**Steps:**
1. Go to **Inventory Management**
2. Click **"Home Screen Order"** tab
3. Ensure **Best Sellers** is at #1 (it should be by default)
4. Click **"Hide"** on **Trending Now**
5. Keep **Categories** at #2

**Result in Mobile App:**
```
Home Screen:
1. ⭐ Best Sellers (sale items)
2. 📦 Categories
(No Trending section shown)
```

---

### Example 2: Launching New Collection

**Goal:** Show Trending first (has new collection), then categories

**Steps:**
1. Go to **"Home Screen Order"** tab
2. Drag **🔥 Trending Now** to the **top** (position #1)
3. **Best Sellers** automatically moves to #2
4. **Categories** stays at #3

**Result in Mobile App:**
```
Home Screen:
1. 🔥 Trending Now (new collection items)
2. ⭐ Best Sellers
3. 📦 Categories
```

---

### Example 3: Organizing Category Display

**Goal:** Show "New Arrivals" category first, then "Sale", then others

**Steps:**
1. Go to **"Categories"** tab
2. Find **"New Arrivals"** category
3. Drag it to the **top**
4. Find **"Sale"** category
5. Drag it to **second position**
6. Arrange other categories as desired

**Result in Mobile App:**
```
Categories Section shows:
┌────────────┬────────────┐
│New Arrivals│    Sale    │
├────────────┼────────────┤
│  Clothing  │  Footwear  │
├────────────┼────────────┤
│    Etc.    │    Etc.    │
└────────────┴────────────┘
```

---

## ⚙️ Setup Requirements (One-Time)

### For Admin Panel

**Database Migrations to Run:**

1. **For Category Reordering:**
   ```sql
   -- Run in Supabase SQL Editor:
   -- migrations/001_add_display_order_to_categories.sql
   ```

2. **For Home Screen Section Ordering:**
   ```sql
   -- Run in Supabase SQL Editor:
   -- migrations/005_create_feature_type_ordering.sql
   ```

**After running migrations:**
- Restart your admin panel
- Navigate to Inventory Management
- You should see the reordering features

---

### For Mobile App

**Update your home screen fetch queries:**

#### 1. Fetch Sections in Order

```typescript
// Fetch which sections to show and in what order
const { data: sections } = await supabase
  .from('feature_sections')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true });

// sections will be in admin-set order
```

#### 2. Fetch Categories in Order

```typescript
// Fetch categories in admin-set order
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true)
  .order('display_order', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false });
```

#### 3. Complete Home Screen Code

```typescript
// HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { supabase } from './supabase';

export default function HomeScreen() {
  const [homeSections, setHomeSections] = useState([]);

  useEffect(() => {
    buildHomeScreen();
  }, []);

  async function buildHomeScreen() {
    // Step 1: Fetch section configuration (what order to show sections)
    const { data: sectionConfig } = await supabase
      .from('feature_sections')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!sectionConfig) return;

    // Step 2: Build sections based on configuration
    const sections = [];

    for (const config of sectionConfig) {
      if (config.section_type === 'best_seller') {
        // Fetch best seller products
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('featured_type', 'best_seller')
          .eq('is_active', true)
          .limit(10);

        sections.push({
          title: config.title, // "Best Sellers"
          icon: config.icon,   // "⭐"
          type: 'products',
          data: products || []
        });
      }
      else if (config.section_type === 'trending') {
        // Fetch trending products
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('featured_type', 'trending')
          .eq('is_active', true)
          .limit(10);

        sections.push({
          title: config.title, // "Trending Now"
          icon: config.icon,   // "🔥"
          type: 'products',
          data: products || []
        });
      }
      else if (config.section_type === 'categories') {
        // Fetch categories in admin-set order
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true, nullsFirst: false });

        sections.push({
          title: config.title, // "Shop by Category"
          icon: config.icon,   // "📦"
          type: 'categories',
          data: categories || []
        });
      }
    }

    setHomeSections(sections);
  }

  return (
    <ScrollView>
      {homeSections.map((section, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>
            {section.icon} {section.title}
          </Text>
          
          {section.type === 'products' ? (
            <HorizontalProductList products={section.data} />
          ) : (
            <CategoryGrid categories={section.data} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
```

---

## 🎯 Understanding the System

### Two-Level Control

#### Level 1: Section Order (Home Screen Order tab)
**Controls:** Which major sections appear and in what order

**Options:**
- Best Sellers section
- Trending section  
- Categories section

**Example:**
```
Admin sets: Trending (#1) → Best Sellers (#2) → Categories (#3)
Mobile shows sections in that order
```

#### Level 2: Category Order (Categories tab)
**Controls:** Order of categories within the Categories section

**Example:**
```
Admin sets: New Arrivals → Sale → Clothing → Footwear
Mobile shows categories in that order
```

### How They Work Together

```
Home Screen Order (Level 1) decides:
1. Best Sellers section
2. Trending section
3. Categories section ← Contains categories

Categories Order (Level 2) decides:
Within the Categories section:
1. New Arrivals
2. Sale
3. Clothing
4. Etc.
```

---

## 💡 Best Practices

### When to Reorder Sections

✅ **Seasonal changes** - Promote seasonal sections first
✅ **Sales events** - Put Best Sellers first during sales
✅ **New launches** - Put Trending first for new collections
✅ **Customer behavior** - Based on analytics (what customers engage with)

### When to Reorder Categories

✅ **Promote new categories** - New category to top
✅ **Seasonal categories** - Summer categories first in summer
✅ **Sales categories** - "Sale" category to top during events
✅ **Popular categories** - Most-browsed categories first

### When to Hide Sections

✅ **Insufficient content** - Hide section with < 3 items
✅ **Off-season** - Hide trending in off-season
✅ **Testing** - Hide while preparing content
✅ **Focus** - Temporarily hide to spotlight others

---

## 🧪 Testing Your Changes

### After Reordering

1. **Save complete** (automatically on drop)
2. **Refresh admin panel** - Order should persist
3. **Open mobile app**
4. **Pull to refresh** or restart app
5. **Check home screen** - Should match admin order

### If Order Doesn't Match

**Check:**
1. ✅ Migration ran successfully in Supabase
2. ✅ Mobile app queries include `ORDER BY display_order ASC`
3. ✅ Mobile app fetches from `feature_sections` table
4. ✅ No errors in admin panel console
5. ✅ Mobile app is refreshing data properly

---

## 📊 Quick Reference Table

| What You Want to Do | Which Tab | What to Drag |
|---------------------|-----------|--------------|
| Change section order | Home Screen Order | Section cards (⭐🔥📦) |
| Change category order | Categories | Category cards |
| Hide/show sections | Home Screen Order | Click Hide/Show button |
| Edit category details | Categories | Click Edit button |

---

## 🎓 Tips for Effective Ordering

### For Maximum Sales

1. **Put best sellers first** - Social proof sells
2. **Trending second** - Creates urgency (FOMO)
3. **Categories third** - For browsers

### For Discovery

1. **Put categories first** - Help customers explore
2. **Trending second** - Show what's new
3. **Best sellers third** - Validate choices

### For Events/Sales

1. **Create "Sale" category** - Put at top of categories
2. **Mark sale items as Best Sellers** - Shows in Best Sellers section
3. **Put Best Sellers first** - Maximize sale visibility

---

## 🐛 Troubleshooting

### Issue: Drag-and-drop not working

**Solutions:**
1. Ensure migrations have been run in Supabase
2. Refresh the admin panel page (hard refresh: Ctrl+Shift+R)
3. Check browser console for errors
4. Try a different browser

### Issue: Changes not showing in mobile app

**Solutions:**
1. Verify mobile app queries include `ORDER BY display_order`
2. Check mobile app is fetching `feature_sections` table
3. Pull to refresh in mobile app
4. Restart mobile app completely

### Issue: Section disappeared after hiding

**Solution:**
1. Go back to Home Screen Order tab
2. Find the hidden section (shows "Hidden" status)
3. Click "Show" button
4. Section will reappear in mobile app

---

## ✅ Checklist for Setup

### Admin Panel Setup
- [ ] Run migration `001_add_display_order_to_categories.sql`
- [ ] Run migration `005_create_feature_type_ordering.sql`
- [ ] Restart admin panel
- [ ] Open Inventory Management
- [ ] Verify "Home Screen Order" tab exists
- [ ] Test drag-and-drop works

### Mobile App Setup
- [ ] Update home screen to fetch `feature_sections` table
- [ ] Add `ORDER BY display_order` to section query
- [ ] Add `ORDER BY display_order` to categories query
- [ ] Test home screen shows correct order
- [ ] Test reordering in admin reflects in app

---

## 🎯 Summary

### What You Can Control

1. **Section Order** - Best Sellers vs Trending vs Categories (which appears first)
2. **Category Order** - Order of categories within Categories section
3. **Section Visibility** - Show/hide entire sections

### Where to Do It

- **Home Screen Order tab** - For section ordering
- **Categories tab** - For category ordering

### How to Do It

1. Click and hold the **≡** drag handle
2. Drag to new position
3. Drop to save
4. Done!

### Mobile App Impact

- Changes reflect on next app refresh
- Order is controlled from admin panel
- No app updates needed for reordering

---

## 📞 Quick Help

**"How do I make Trending appear first?"**
→ Home Screen Order tab → Drag Trending to top

**"How do I change category order?"**
→ Categories tab → Drag categories to desired positions

**"How do I hide a section?"**
→ Home Screen Order tab → Click Hide button on section

**"How long until mobile app shows changes?"**
→ Immediately after mobile app refreshes data (pull to refresh or restart)

---

## 🎉 You're Ready!

This system gives you **complete control** over your mobile app home screen layout without needing to update the mobile app code.

**Just drag, drop, and your mobile app updates!**

---

## 📚 Related Documentation

- `HOME_SCREEN_SECTION_ORDERING.md` - Technical details
- `CATEGORY_REORDERING_FEATURE.md` - Category ordering details
- `FEATURED_PRODUCTS_FILTER.md` - Featured products management

---

**Questions?** Refer to the documentation files above or contact support.

Happy reordering! 🎨✨

