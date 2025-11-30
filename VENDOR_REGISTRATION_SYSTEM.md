# Vendor Registration & Dashboard System

## Overview

Complete vendor registration flow with role-based access control, vendor dashboard, product management, and order management.

## Features

### 1. Vendor Registration Flow
- **Public Registration Page**: `/vendor/register`
  - Multi-step form (4 steps)
  - Business information
  - Address details
  - Bank account information
  - Document uploads (Business License, GST Certificate, PAN Card, Bank Proof)
  - Success confirmation page

### 2. Admin Approval System
- **Admin Page**: `/admin/VendorRegistrationRequests`
  - View all registration requests
  - Filter by status (pending, approved, rejected, etc.)
  - View detailed request information
  - Approve/Reject requests
  - Document viewing
  - Automatic vendor account creation on approval

### 3. Vendor Dashboard
- **Vendor Dashboard**: `/vendor/dashboard`
  - Role-based access (only vendors can access)
  - Statistics overview:
    - Total Products
    - Active Products
    - Total Orders
    - Pending Orders
    - Total Revenue
    - Monthly Revenue
  - Quick actions for common tasks

### 4. Product Management
- **Product List**: `/vendor/products`
  - View all vendor products
  - Search functionality
  - Activate/Deactivate products
  - Edit products
  - Delete products

- **Add Product**: `/vendor/products/add`
  - Full product creation form
  - Image uploads
  - Category selection
  - Size and color variants
  - Pricing information
  - Return/replacement policies

- **Edit Product**: `/vendor/products/edit?id={productId}`
  - Edit existing products
  - Update images
  - Modify all product details
  - Toggle active status

### 5. Order Management
- **Order List**: `/vendor/orders`
  - View all vendor orders
  - Filter by status
  - Order details with items
  - Update order status:
    - Accept pending orders
    - Mark as processing
    - Mark as completed
    - Cancel orders

### 6. Role-Based Access Control
- **Login System**: Updated to support vendor role
  - Admin users → `/admin/Dashboard`
  - Vendor users → `/vendor/dashboard`
  - Automatic role detection and redirection
  - Access protection on all vendor routes

## Database Schema

### Tables Created/Updated

1. **vendor_registration_requests**
   - Stores registration applications
   - Status tracking (pending, approved, rejected, etc.)
   - Document URLs
   - Business and contact information

2. **vendors** (updated)
   - Added `user_id` reference
   - Added `registration_request_id` reference
   - Added `gstin`, `pan`, `business_address` fields

3. **users** (updated)
   - Added `vendor_id` reference
   - Role field supports 'vendor' value

## File Structure

```
app/
├── vendor/
│   ├── register/
│   │   ├── page.tsx (Registration form)
│   │   └── success/
│   │       └── page.tsx (Success page)
│   ├── dashboard/
│   │   └── page.tsx (Vendor dashboard)
│   ├── products/
│   │   ├── page.tsx (Product list)
│   │   ├── add/
│   │   │   └── page.tsx (Add product)
│   │   └── edit/
│   │       └── page.tsx (Edit product)
│   └── orders/
│       └── page.tsx (Order management)
└── admin/
    └── VendorRegistrationRequests/
        └── page.tsx (Admin approval page)

migrations/
└── 019_create_vendor_registration_system.sql
```

## Setup Instructions

### 1. Run Database Migration

```sql
-- Run the migration file
migrations/019_create_vendor_registration_system.sql
```

This will:
- Create `vendor_registration_requests` table
- Update `vendors` table with new fields
- Update `users` table with vendor reference
- Create indexes and RLS policies

### 2. Update Login System

The login page (`app/auth/Login/page.tsx`) has been updated to:
- Check user role
- Redirect vendors to `/vendor/dashboard`
- Redirect admins to `/admin/Dashboard`

### 3. Access Routes

**Public Routes:**
- `/vendor/register` - Vendor registration (public)

**Vendor Routes (Protected):**
- `/vendor/dashboard` - Vendor dashboard
- `/vendor/products` - Product management
- `/vendor/products/add` - Add product
- `/vendor/products/edit` - Edit product
- `/vendor/orders` - Order management

**Admin Routes:**
- `/admin/VendorRegistrationRequests` - Approve/reject registrations

## User Flow

### Vendor Registration Flow

1. **Vendor visits** `/vendor/register`
2. **Fills out** 4-step registration form:
   - Business Information
   - Address Details
   - Bank Details
   - Document Uploads
3. **Submits** registration request
4. **Receives** confirmation message
5. **Admin reviews** request in `/admin/VendorRegistrationRequests`
6. **Admin approves** → Vendor account created
7. **Vendor receives** email notification (to be implemented)
8. **Vendor logs in** → Redirected to `/vendor/dashboard`

### Vendor Dashboard Flow

1. **Vendor logs in** with credentials
2. **System checks** role and redirects to `/vendor/dashboard`
3. **Vendor views** statistics and quick actions
4. **Vendor manages** products and orders

## Security Features

1. **Role-Based Access Control**
   - All vendor routes check authentication
   - Verify user role is 'vendor'
   - Verify vendor account is active
   - Redirect unauthorized users to login

2. **Data Isolation**
   - Vendors can only see their own products
   - Vendors can only see their own orders
   - Vendor ID automatically set on product creation

3. **RLS Policies**
   - Row Level Security enabled on registration requests
   - Users can view their own requests
   - Admins can view all requests

## API Integration Points

### Creating Vendor User Account

After admin approves a vendor registration, you need to create a user account. This can be done via:

1. **Admin creates user manually** in User Management
2. **API endpoint** (to be created) that:
   - Creates auth user
   - Creates user record with role='vendor'
   - Links user to vendor record

Example API call:
```javascript
POST /api/auth/create-user
{
  "email": "vendor@example.com",
  "password": "temporary_password",
  "name": "Vendor Name",
  "role": "vendor",
  "vendor_id": "vendor-uuid",
  "is_active": true
}
```

## Future Enhancements

1. **Email Notifications**
   - Send email when registration is submitted
   - Send email when registration is approved/rejected
   - Send email with login credentials

2. **Vendor Profile Management**
   - Edit vendor profile
   - Update business information
   - Manage documents

3. **Analytics Dashboard**
   - Sales charts
   - Product performance metrics
   - Revenue trends

4. **Inventory Management**
   - Stock tracking
   - Low stock alerts
   - Bulk operations

5. **Order Fulfillment**
   - Shipping label generation
   - Tracking number management
   - Delivery status updates

## Testing Checklist

- [ ] Vendor can register successfully
- [ ] Admin can view registration requests
- [ ] Admin can approve/reject requests
- [ ] Vendor can log in after approval
- [ ] Vendor dashboard loads correctly
- [ ] Vendor can add products
- [ ] Vendor can edit products
- [ ] Vendor can view orders
- [ ] Vendor can update order status
- [ ] Unauthorized access is blocked
- [ ] Role-based redirects work correctly

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Ensure user has correct role in database
4. Check Supabase RLS policies

