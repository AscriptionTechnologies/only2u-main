# Vendors Table Integration

## Overview

The system has been updated to use the dedicated `vendors` table instead of filtering the `users` table by role. This provides better separation of concerns and cleaner data management.

---

## 🎯 Changes Made

### 1. **Database Migration Updated**
- `vendor_id` in products table now references `vendors(id)` instead of `users(id)`
- Foreign key constraint points to vendors table
- Migration file: `migrations/007_add_vendor_id_to_products.sql`

### 2. **Vendor Management Page Updated**
- Fetches vendors from `vendors` table
- Creates vendors in both `users` and `vendors` tables
- Updates vendors in `vendors` table
- Deletes vendors from `vendors` table

### 3. **Product Form Updated**
- Fetches vendors from `vendors` table for dropdown
- Only shows active vendors
- Saves `vendor_id` referencing vendors table

### 4. **API Route Updated**
- Creates user in `users` table with authentication
- Also inserts vendor into `vendors` table when role is "vendor"
- Dual insertion ensures both tables stay in sync

---

## 📊 Database Structure

### Vendors Table

Expected structure:
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  phone VARCHAR,
  location VARCHAR,
  is_active BOOLEAN DEFAULT true,
  profilePhoto VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Relationships

```
vendors
  ↓ (vendor_id)
products
```

### Dual Table Structure

```
users (auth + general info)
  ↓ (same id)
vendors (vendor-specific data)
```

---

## 🔄 How It Works

### Creating a Vendor

1. **Admin Panel** → Vendor Management → Add Vendor
2. **API Route** (`/api/auth/create-user`) does:
   ```javascript
   // Step 1: Create auth user
   supabase.auth.admin.createUser({ email, password })
   
   // Step 2: Insert into users table
   supabase.from('users').insert({ id, name, email, role: 'vendor', ... })
   
   // Step 3: Insert into vendors table (if role is vendor)
   supabase.from('vendors').insert({ id, name, email, ... })
   ```
3. **Result**: Vendor exists in:
   - ✅ Supabase Auth (for login)
   - ✅ `users` table (general info)
   - ✅ `vendors` table (vendor-specific)

### Updating a Vendor

1. **Admin Panel** → Vendor Management → Edit Vendor
2. **Frontend** updates:
   ```javascript
   supabase.from('vendors').update({ name, email, ... })
   ```
3. **Result**: Vendor info updated in `vendors` table

### Deleting a Vendor

1. **Admin Panel** → Vendor Management → Delete Vendor
2. **Frontend** deletes:
   ```javascript
   supabase.from('vendors').delete().eq('id', vendorId)
   ```
3. **Result**: Vendor removed from `vendors` table
4. **Note**: Consider cascading to products or setting vendor_id to NULL

### Assigning Vendor to Product

1. **Admin Panel** → Add/Edit Product
2. **Vendor Dropdown** loads from:
   ```javascript
   supabase.from('vendors')
     .select('id, name')
     .eq('is_active', true)
     .order('name')
   ```
3. **Save Product** with:
   ```javascript
   supabase.from('products').insert/update({
     ...productData,
     vendor_id: selectedVendorId
   })
   ```

---

## 🚀 Setup Instructions

### Step 1: Ensure Vendors Table Exists

Check in Supabase Table Editor if `vendors` table exists with columns:
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `phone` (VARCHAR, optional)
- `location` (VARCHAR, optional)
- `is_active` (BOOLEAN)
- `profilePhoto` (VARCHAR, optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Step 2: Run Migration

In Supabase SQL Editor, run:
```sql
-- File: migrations/007_add_vendor_id_to_products.sql
```

This adds `vendor_id` column to products table with foreign key to vendors table.

### Step 3: Migrate Existing Data (Optional)

If you have existing vendors in `users` table:

```sql
-- Insert existing vendors into vendors table
INSERT INTO vendors (id, name, email, phone, location, is_active, profilePhoto, created_at)
SELECT id, name, email, phone, location, is_active, profilePhoto, created_at
FROM users
WHERE role = 'vendor'
ON CONFLICT (id) DO NOTHING;

-- Link existing products to vendors
UPDATE products 
SET vendor_id = vendors.id
FROM vendors
WHERE products.vendor_name = vendors.name 
AND products.vendor_id IS NULL;
```

### Step 4: Verify Integration

1. Go to **Vendor Management**
2. Try creating a new vendor
3. Check in Supabase:
   - ✅ Auth user created
   - ✅ Entry in `users` table
   - ✅ Entry in `vendors` table
4. Go to **Add Product**
5. Check vendor dropdown shows vendors from `vendors` table

---

## 📝 Files Changed

### 1. **migrations/007_add_vendor_id_to_products.sql**
```sql
-- References vendors table instead of users table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
```

### 2. **app/admin/VendorManagement/page.tsx**
```javascript
// Fetch from vendors table
.from("vendors")
.select("id, name, email, is_active, location, phone, profilePhoto")

// Update in vendors table
.from("vendors").update({ ... })

// Delete from vendors table
.from("vendors").delete()
```

### 3. **app/admin/ProductForm/page.tsx**
```javascript
// Fetch vendors for dropdown
.from("vendors")
.select("id, name")
.eq("is_active", true)
.order("name", { ascending: true })
```

### 4. **app/api/auth/create-user/route.ts**
```javascript
// Insert into both tables
await supabase.from('users').insert({ ... })
if (role === 'vendor') {
  await supabase.from('vendors').insert({ ... })
}
```

---

## ⚠️ Important Considerations

### 1. Data Consistency

Since vendors exist in TWO tables (`users` and `vendors`), ensure:
- ✅ Same `id` in both tables
- ✅ Email matches in both tables
- ✅ Updates sync between tables (if needed)

**Recommendation**: Use database triggers to keep tables in sync:
```sql
CREATE OR REPLACE FUNCTION sync_vendor_to_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET name = NEW.name,
      email = NEW.email,
      is_active = NEW.is_active,
      location = NEW.location,
      phone = NEW.phone,
      profilePhoto = NEW.profilePhoto
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_vendors
AFTER UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_to_users();
```

### 2. Cascading Deletes

When deleting a vendor, decide what happens to products:
- **Option A**: Set `vendor_id` to NULL (current: `ON DELETE SET NULL`)
- **Option B**: Prevent deletion if products exist
- **Option C**: Cascade delete (not recommended)

### 3. Role-Based Access

Vendors login with their email/password and should:
- ✅ See only their products
- ✅ Manage their Q&A
- ✅ View their orders

Ensure your RLS policies check vendor_id appropriately.

---

## 🔍 Troubleshooting

### Issue: "relation vendors does not exist"

**Solution**: Create the vendors table in Supabase first.

### Issue: Vendors not showing in dropdown

**Check:**
1. Vendors exist in `vendors` table
2. Vendors have `is_active = true`
3. Console for error messages
4. Network tab for API response

### Issue: Cannot create vendor

**Check:**
1. All required fields filled
2. Email not already in use
3. Console for specific error
4. Supabase Auth settings allow email signup

### Issue: Foreign key constraint fails

**Check:**
1. `vendor_id` references existing vendor in `vendors` table
2. Migration ran successfully
3. Vendor wasn't deleted while products still reference it

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] `vendors` table exists in Supabase
- [ ] Migration added `vendor_id` column to products
- [ ] Foreign key references `vendors(id)`
- [ ] Vendor Management loads from `vendors` table
- [ ] Can create new vendor (appears in both tables)
- [ ] Can update vendor (updates `vendors` table)
- [ ] Can delete vendor (deletes from `vendors` table)
- [ ] Product form dropdown shows vendors
- [ ] Can assign vendor to product
- [ ] `vendor_id` saved correctly in products table

---

## 🎓 Benefits

### Better Separation
- `users` table: Authentication and general user data
- `vendors` table: Vendor-specific data and business logic

### Cleaner Queries
```javascript
// Before: Filter by role
.from('users').eq('role', 'vendor')

// After: Direct table access
.from('vendors')
```

### Scalability
- Easy to add vendor-specific columns
- Better indexing for vendor queries
- Simpler joins in complex queries

### Performance
- Dedicated indexes on vendors table
- No need to filter by role
- Faster queries for vendor-specific operations

---

## 🔮 Next Steps

### 1. Add Vendor Dashboard
Allow vendors to:
- View their products
- Manage their Q&A
- See their sales analytics

### 2. Vendor-Specific Features
- Commission tracking
- Payout management
- Performance metrics

### 3. Bulk Operations
- Import vendors from CSV
- Bulk assign products to vendors
- Batch updates

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Verify table structure matches expected schema
4. Ensure migrations ran successfully
5. Check foreign key constraints

All systems are now using the dedicated `vendors` table! 🎉

