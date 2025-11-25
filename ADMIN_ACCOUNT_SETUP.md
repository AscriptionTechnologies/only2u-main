# Admin Account Setup Guide

This guide will help you create your first admin account for the dashboard.

## Method 1: Using the Create Admin Page (Recommended) 🌟

The easiest way to create your first admin account is using the dedicated setup page:

### Steps:

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the create admin page**:
   ```
   http://localhost:3000/auth/create-admin
   ```

3. **Fill in the form**:
   - **Full Name**: Your name
   - **Email Address**: Your admin email
   - **Password**: Choose a strong password (min. 6 characters)
   - **Phone Number**: Optional

4. **Click "Create Admin Account"**

5. **You'll be redirected to the login page** where you can log in with your new credentials

### 🔒 Important Security Note

After creating your admin account, **delete the create-admin page** for security:

```bash
rm -rf "app/auth/create-admin"
```

Or manually delete the folder:
```
app/auth/create-admin/
```

This prevents unauthorized users from creating admin accounts.

---

## Method 2: Using Supabase Dashboard (Direct SQL)

If you prefer to create the admin account directly in the database:

### Steps:

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Navigate to your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run this SQL query** (replace the values):

```sql
-- First, create the auth user
-- Note: You'll need to get the user ID from Supabase Auth after this step

-- Go to Authentication > Users in Supabase Dashboard
-- Click "Add User" and create a user with your email and password
-- Copy the User ID that's generated

-- Then insert into your users table:
INSERT INTO users (
  id,
  name,
  email,
  role,
  is_active,
  phone,
  created_at,
  updated_at
) VALUES (
  'PASTE_USER_ID_HERE',  -- Replace with the UUID from Supabase Auth
  'Your Name',           -- Your full name
  'admin@example.com',   -- Your email (must match auth user)
  'admin',               -- Role must be 'admin'
  true,                  -- Active status
  '+1234567890',         -- Your phone number (optional)
  NOW(),
  NOW()
);
```

### Detailed Steps for Method 2:

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **"Add User"** button
3. Fill in:
   - **Email**: Your admin email
   - **Password**: Your admin password
   - Click **"Create User"**
4. **Copy the User ID** from the newly created user
5. Go to **SQL Editor** → **New Query**
6. Paste the SQL above and replace `PASTE_USER_ID_HERE` with the copied ID
7. Update the name, email, and phone fields
8. Click **"Run"**

---

## Method 3: Using the User Management Page (After First Login)

Once you have at least one admin account, you can create additional admin accounts from within the dashboard:

### Steps:

1. **Log in** to your admin dashboard
2. **Navigate to**: User Management (from the sidebar)
3. **Click**: "+ Add New User" button
4. **Fill in the form**:
   - Name
   - Email
   - Password
   - **Role**: Select "Admin"
   - Phone (required)
   - Other fields (optional)
5. **Check**: "User is active"
6. **Click**: "Add User"

---

## Verification

After creating your admin account, verify it works:

1. **Go to the login page**:
   ```
   http://localhost:3000/auth/Login
   ```

2. **Enter your credentials**:
   - Email: The email you used
   - Password: The password you set

3. **Click "Login"**

4. **You should be redirected to**:
   ```
   http://localhost:3000/admin/Dashboard
   ```

If you see the dashboard, congratulations! 🎉 Your admin account is working.

---

## Troubleshooting

### Issue: "Access denied! Admin privileges required"

**Solution**: Check that the user's role in the `users` table is set to `'admin'` (lowercase).

```sql
-- Check user role
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';

-- If role is not 'admin', update it:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Issue: "Authentication failed"

**Solution**: 
1. Verify the email and password are correct
2. Check that the user exists in Supabase Auth (Authentication → Users)
3. Ensure the user's email is confirmed (or disable email confirmation in Supabase settings)

### Issue: "User not found in database"

**Solution**: The user exists in Supabase Auth but not in your `users` table. Run this query:

```sql
INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
VALUES (
  'USER_ID_FROM_AUTH',
  'Your Name',
  'your-email@example.com',
  'admin',
  true,
  NOW(),
  NOW()
);
```

### Issue: Can't access the create-admin page

**Solution**: Make sure your dev server is running:
```bash
npm run dev
```

---

## Security Best Practices

1. ✅ **Use strong passwords** (at least 12 characters, mix of letters, numbers, symbols)
2. ✅ **Delete the create-admin page** after initial setup
3. ✅ **Enable 2FA** in Supabase for extra security (optional but recommended)
4. ✅ **Use environment variables** for sensitive data (already configured)
5. ✅ **Regularly review user accounts** in User Management
6. ✅ **Only grant admin role** to trusted users

---

## Next Steps

After creating your admin account:

1. ✅ **Delete the create-admin page** (security)
2. ✅ **Set up the category ordering** (see IMPLEMENTATION_SUMMARY.md)
3. ✅ **Create product categories** (Category Management)
4. ✅ **Add products** (via Category Management → Products)
5. ✅ **Manage users** (User Management)
6. ✅ **Configure vendors** (Vendor Management)

---

## Support

If you encounter any issues:

1. Check the browser console for error messages (F12)
2. Check the Supabase logs in your dashboard
3. Verify your Supabase credentials in `lib/supabase.ts`
4. Ensure all required tables exist in your database

## Database Schema Required

Your `users` table should have these columns:

```sql
users (
  id: uuid (primary key, references auth.users)
  name: text
  email: text (unique)
  role: text (check role in ('admin', 'editor', 'user'))
  is_active: boolean
  phone: text
  location: text
  profilePhoto: text
  skinTone: text
  waistSize: integer
  bustSize: integer
  hipSize: integer
  size: text
  height: integer
  weight: integer
  coin_balance: integer
  created_at: timestamp
  updated_at: timestamp
  last_login: timestamp
)
```

If any columns are missing, create them in Supabase SQL Editor.

---

## Quick Reference

- **Login Page**: `/auth/Login`
- **Create Admin**: `/auth/create-admin` (delete after use!)
- **Dashboard**: `/admin/Dashboard`
- **User Management**: `/admin/UserManagement`

---

Happy administrating! 🚀

