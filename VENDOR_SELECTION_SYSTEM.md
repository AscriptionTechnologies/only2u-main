# Vendor Selection System

## Overview

The vendor selection system has been implemented to replace free-text vendor entry with a dropdown selection that links products to vendors in the database.

---

## 🎯 Features

✅ **Dropdown Selection** - Select vendor from a list of active vendors  
✅ **Database Link** - Products are linked to vendors via `vendor_id` foreign key  
✅ **Auto-fill** - Vendor name is automatically filled when selected  
✅ **Active Only** - Only active vendors appear in the dropdown  
✅ **Sorted List** - Vendors are sorted alphabetically by name  
✅ **Backwards Compatible** - Old `vendor_name` and `alias_vendor` fields are preserved  

---

## 🚀 Setup

### Step 1: Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- File: migrations/007_add_vendor_id_to_products.sql
```

This adds:
- `vendor_id` column to `products` table
- Foreign key constraint to `users` table (vendor role)
- Index for better performance

### Step 2: Verify Migration

In Supabase Table Editor:
1. Open `products` table
2. Check that `vendor_id` column exists (UUID type)
3. Verify it has a foreign key to `users.id`

### Step 3: Test the Feature

1. Go to **Admin Panel** → **Add Product**
2. Scroll to **Vendor Information** section
3. You'll see a dropdown instead of text input
4. Select a vendor from the dropdown
5. Save the product

✅ **Setup complete!**

---

## 📊 Database Changes

### New Column

```sql
-- Added to products table
vendor_id UUID REFERENCES users(id) ON DELETE SET NULL
```

### Relationships

```
users (role = 'vendor')
    ↓ (vendor_id)
products
```

### Index

```sql
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
```

---

## 🎨 UI Changes

### Before (Text Input)
```
┌─────────────────────────────────┐
│ Vendor Name                     │
│ [Enter vendor name...        ]  │
└─────────────────────────────────┘
```

### After (Dropdown Selection)
```
┌─────────────────────────────────┐
│ Select Vendor *                 │
│ [▼ John's Store              ]  │
│   -- Select Vendor --           │
│   ✓ John's Store                │
│   ABC Vendors                   │
│   XYZ Suppliers                 │
└─────────────────────────────────┘
```

---

## 🔄 How It Works

### When Adding a Product

1. Admin selects vendor from dropdown
2. System saves:
   - `vendor_id` - UUID linking to vendor
   - `vendor_name` - Vendor's name (auto-filled)
   - `alias_vendor` - Optional alias (manual entry)

### When Editing a Product

1. Existing vendor is pre-selected in dropdown
2. Admin can change vendor if needed
3. System updates all vendor fields

### Dropdown Population

- Fetches vendors from `users` table
- Filters: `role = 'vendor'` AND `is_active = true`
- Sorts: Alphabetically by name
- Shows message if no vendors found

---

## 🛠️ Implementation Details

### Files Changed

1. **migrations/007_add_vendor_id_to_products.sql**
   - Database migration file

2. **app/admin/ProductForm/page.tsx**
   - Added `vendors` state
   - Added `fetchVendors()` function
   - Replaced text input with `<select>` dropdown
   - Auto-fills `vendor_name` when vendor selected
   - Updates product creation/update logic

### Code Changes

```typescript
// Vendor state
const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

// Fetch vendors
const fetchVendors = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "vendor")
    .eq("is_active", true)
    .order("name", { ascending: true });
  setVendors(data || []);
};

// Vendor selection dropdown
<select
  value={formData.vendor_id}
  onChange={(e) => {
    const selectedVendor = vendors.find(v => v.id === e.target.value);
    setFormData({
      ...formData,
      vendor_id: e.target.value,
      vendor_name: selectedVendor?.name || "",
    });
  }}
>
  <option value="">-- Select Vendor --</option>
  {vendors.map((vendor) => (
    <option key={vendor.id} value={vendor.id}>
      {vendor.name}
    </option>
  ))}
</select>
```

---

## ⚠️ Important Notes

### Backwards Compatibility

- Old `vendor_name` and `alias_vendor` fields are **still present**
- Existing products without `vendor_id` will continue to work
- You can optionally migrate old data:

```sql
-- Optional: Link existing products to vendors by name
UPDATE products 
SET vendor_id = users.id
FROM users
WHERE products.vendor_name = users.name 
AND users.role = 'vendor'
AND products.vendor_id IS NULL;
```

### Required Field

- Vendor selection is now **required** (marked with red asterisk)
- Products cannot be created without selecting a vendor
- Ensure you have active vendors before adding products

### No Vendors Warning

If no active vendors exist, the form shows:
```
No active vendors found. Please add vendors first.
```

---

## 📱 Mobile App Integration

### For Mobile Developers

When fetching products, include vendor information:

```javascript
// Fetch products with vendor details
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    vendor:users!vendor_id(id, name, email, profilePhoto)
  `);
```

This gives you:
- Full vendor details (name, email, photo)
- Direct link via `vendor_id`
- Backwards compatible with `vendor_name`

---

## 🔍 Troubleshooting

### "No active vendors found"

**Solution:** 
1. Go to **Vendor Management**
2. Add at least one vendor
3. Make sure vendor is marked as **Active**
4. Refresh the Add Product page

### Vendor not appearing in dropdown

**Check:**
- Vendor has `role = 'vendor'` in users table
- Vendor has `is_active = true`
- Refresh the page to reload vendor list

### Error saving product

**Check:**
- Vendor is selected (required field)
- `vendor_id` exists in the form data
- Foreign key constraint is properly set up

---

## 🎓 Usage

### Adding a New Product

1. Click **Add Product** button
2. Fill in product details (name, description, etc.)
3. Scroll to **Vendor Information** section
4. **Select a vendor** from the dropdown ⚠️ Required
5. Optionally enter an alias vendor name
6. Continue with variants, pricing, etc.
7. Click **Save Product**

### Editing an Existing Product

1. Click **Edit** on any product
2. Existing vendor will be pre-selected
3. Change vendor if needed
4. Save changes

---

## ✨ Benefits

1. **Data Integrity** - Foreign key ensures valid vendor links
2. **No Typos** - Dropdown prevents misspelled vendor names
3. **Easy Management** - Central vendor management in one place
4. **Better Queries** - Can join products with full vendor details
5. **Scalable** - Easy to add vendor-specific features later

---

## 🔮 Future Enhancements

Possible additions:
- Filter products by vendor
- Vendor-specific dashboards
- Vendor performance analytics
- Bulk assign products to vendors
- Vendor contact info on product pages

