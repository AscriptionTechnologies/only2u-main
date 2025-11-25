# Draft Order System for Out-of-Stock Products

## Overview

This feature allows customers to place orders for out-of-stock products through the mobile app. These orders are stored as **draft orders** and appear in the admin panel for review. Admins can then approve (convert to regular order) or reject the draft orders.

---

## 🎯 How It Works

### Customer Flow (Mobile App)

```
1. Customer browses products
        ↓
2. Tries to order out-of-stock item
        ↓
3. Mobile app detects stock unavailability
        ↓
4. Shows option: "Order anyway when back in stock?"
        ↓
5. Customer proceeds with order
        ↓
6. Creates DRAFT ORDER (not regular order)
        ↓
7. Customer receives confirmation
```

### Admin Flow (Admin Panel)

```
1. Draft order appears in Order Management
        ↓
2. Admin clicks "Draft Orders" tab
        ↓
3. Reviews draft order details
        ↓
4. Decides: Approve or Reject
        ↓
5a. APPROVE → Converts to regular order
5b. REJECT → Marks as rejected with reason
        ↓
6. Customer is notified (via mobile app)
```

---

## 📋 Database Schema

### Tables Created

#### 1. `customer_draft_orders`
```sql
id                 UUID (PK)
user_id            UUID (FK → users)
order_number       VARCHAR (unique, format: DRAFT-YYYYMMDD-00001)
total_amount       DECIMAL
shipping_address   TEXT
billing_address    TEXT
payment_method     VARCHAR
payment_status     VARCHAR (default: 'pending')
status             VARCHAR (default: 'draft')
notes              TEXT
created_at         TIMESTAMP
updated_at         TIMESTAMP
approved_at        TIMESTAMP
approved_by        UUID (FK → users)
rejection_reason   TEXT
```

#### 2. `customer_draft_order_items`
```sql
id                  UUID (PK)
draft_order_id      UUID (FK → customer_draft_orders)
product_id          UUID (FK → products)
product_variant_id  UUID (FK → product_variants)
product_name        VARCHAR
product_sku         VARCHAR
product_image       TEXT
size                VARCHAR
color               VARCHAR
quantity            INTEGER
unit_price          DECIMAL
total_price         DECIMAL
created_at          TIMESTAMP
```

### Indexes

- `idx_customer_draft_orders_user_id` - Fast user lookup
- `idx_customer_draft_orders_status` - Filter by status
- `idx_customer_draft_orders_created_at` - Sort by date
- `idx_customer_draft_order_items_draft_order_id` - Fast item lookup

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run:

```sql
-- Run the migration file:
-- migrations/002_create_customer_draft_orders.sql
```

Or run the SQL directly from the migration file.

This will create:
- `customer_draft_orders` table
- `customer_draft_order_items` table
- Necessary indexes
- Auto-update triggers
- Order number generation function

### Step 2: Verify Tables Created

Check in Supabase Table Editor:
- ✅ `customer_draft_orders` table exists
- ✅ `customer_draft_order_items` table exists

### Step 3: Test in Admin Panel

1. Navigate to **Order Management**
2. You should see two tabs:
   - **Draft Orders (Out-of-Stock)** ← New!
   - **Regular Orders**
3. Click "Draft Orders" tab
4. Initially empty (no draft orders yet)

---

## 🎨 Admin Panel Features

### Order Management Screen

#### Tab Navigation
```
┌──────────────────────────────────────────┐
│  Order Management                        │
│                                          │
│  [Draft Orders (Out-of-Stock) 3]  [Regular Orders 15] │
│  ─────────────────────────                           │
└──────────────────────────────────────────┘
```

#### Draft Orders Tab

Shows:
- Order number (DRAFT-YYYYMMDD-00001)
- Customer information
- Total amount
- Status (draft/approved/rejected)
- Created date
- Actions (View/Approve/Reject/Delete)

#### Actions Available

**View Details** 👁️
- See full order information
- Customer details
- Shipping/billing addresses
- All order items
- Notes
- Approve/Reject directly from modal

**Approve** ✅
- Converts draft to regular order
- Changes order number (DRAFT → ORD)
- Moves to regular orders
- Creates regular order_items
- Updates status to 'approved'

**Reject** ❌
- Marks order as rejected
- Prompts for rejection reason
- Keeps in draft orders (for records)
- Status shows as 'rejected'

**Delete** 🗑️
- Permanently removes draft order
- Deletes all associated items
- Cannot be undone

---

## 📱 Mobile App Integration

### API Endpoint for Creating Draft Orders

**POST** `/api/orders/draft/create`

#### Request Body

```json
{
  "user_id": "uuid-of-user",
  "items": [
    {
      "product_id": "uuid-of-product",
      "product_variant_id": "uuid-of-variant",
      "product_name": "Product Name",
      "product_sku": "SKU123",
      "product_image": "https://cloudinary.com/image.jpg",
      "size": "Medium",
      "color": "Red",
      "quantity": 2,
      "unit_price": 999.00
    }
  ],
  "shipping_address": "123 Main St, City, State 12345",
  "billing_address": "123 Main St, City, State 12345",
  "payment_method": "COD",
  "notes": "Order placed for out-of-stock items"
}
```

#### Response (Success)

```json
{
  "success": true,
  "draft_order": {
    "id": "uuid",
    "order_number": "DRAFT-20251015-00001",
    "total_amount": 1998.00,
    "status": "draft",
    "created_at": "2025-10-15T10:30:00Z"
  },
  "message": "Draft order created successfully"
}
```

#### Response (Error)

```json
{
  "error": "Missing required fields: user_id and items"
}
```

### Mobile App Implementation Example

```typescript
// In your mobile app checkout/order creation logic

async function createOrder(orderData: OrderData) {
  // Check if all products are in stock
  const allInStock = await checkStockAvailability(orderData.items);
  
  if (allInStock) {
    // Create regular order
    return await createRegularOrder(orderData);
  } else {
    // Show alert to user
    const userConfirmed = await showAlert({
      title: "Some items are out of stock",
      message: "Would you like to place a draft order? We'll notify you when items are available.",
      buttons: ["Cancel", "Place Draft Order"]
    });
    
    if (userConfirmed) {
      // Create draft order
      return await createDraftOrder(orderData);
    }
  }
}

async function createDraftOrder(orderData: OrderData) {
  try {
    const response = await fetch(`${API_URL}/api/orders/draft/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: orderData.userId,
        items: orderData.items.map(item => ({
          product_id: item.productId,
          product_variant_id: item.variantId,
          product_name: item.name,
          product_sku: item.sku,
          product_image: item.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress,
        payment_method: orderData.paymentMethod,
        notes: 'Order placed for out-of-stock items',
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Show success message
      showSuccessMessage({
        title: "Draft Order Placed",
        message: `Your order (${result.draft_order.order_number}) is pending approval. We'll notify you when it's confirmed.`
      });
      
      return result.draft_order;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error creating draft order:', error);
    showErrorMessage('Failed to create draft order');
  }
}
```

---

## 🔄 Approval/Rejection Workflow

### Approving a Draft Order

**Endpoint:** `POST /api/orders/draft/approve`

```json
{
  "draft_order_id": "uuid-of-draft-order",
  "approved_by": "uuid-of-admin-user" // Optional
}
```

**What Happens:**
1. Fetches draft order with all items
2. Creates new regular order with order number: `ORD-YYYYMMDD-00001`
3. Copies all items to `order_items` table
4. Updates draft order status to 'approved'
5. Sets approval timestamp
6. Returns the new regular order

**Response:**
```json
{
  "success": true,
  "order": { /* regular order object */ },
  "message": "Draft order approved and converted to regular order"
}
```

### Rejecting a Draft Order

**Endpoint:** `POST /api/orders/draft/reject`

```json
{
  "draft_order_id": "uuid-of-draft-order",
  "rejection_reason": "Out of stock, cannot fulfill"
}
```

**What Happens:**
1. Updates draft order status to 'rejected'
2. Saves rejection reason
3. Keeps draft order for records
4. Can be used to notify customer

**Response:**
```json
{
  "success": true,
  "draft_order": { /* updated draft order */ },
  "message": "Draft order rejected successfully"
}
```

---

## 💡 Use Cases

### Use Case 1: Seasonal Product
```
Scenario: Customer wants winter jacket in summer (out of stock)

Flow:
1. Customer places draft order
2. Admin sees order in "Draft Orders" tab
3. Admin checks if product will be restocked
4. If yes → Approve (converts to order, customer notified)
5. If no → Reject (customer notified, can offer alternative)
```

### Use Case 2: Popular Item Sold Out
```
Scenario: Trending product sold out temporarily

Flow:
1. Multiple customers place draft orders
2. Admin sees all draft orders
3. Restocks product from vendor
4. Approves all draft orders in batch
5. Customers notified and orders processed
```

### Use Case 3: Pre-Order System
```
Scenario: New product launching next month

Flow:
1. Mark as "out of stock" (not yet available)
2. Customers place draft orders (pre-orders)
3. Admin tracks pre-order demand
4. Product arrives
5. Approve all draft orders
6. Ship to customers
```

---

## 🎯 Admin Panel UI Features

### Draft Orders Tab

**Highlighted Features:**
- Amber/yellow theme for draft orders
- Clear "DRAFT" badge on each order
- Pending count in tab badge
- Warning message at top
- Quick actions (Approve/Reject)

**Order Status Indicators:**
- 🟡 **Draft** - Awaiting admin action (amber)
- 🟢 **Approved** - Converted to regular order (green)
- 🔴 **Rejected** - Declined by admin (red)

### Actions Per Order

| Action | Icon | Function | Availability |
|--------|------|----------|--------------|
| View | 👁️ | See full details | Always |
| Approve | ✅ | Convert to order | Status = draft |
| Reject | ❌ | Decline order | Status = draft |
| Delete | 🗑️ | Remove permanently | Always |

### View Details Modal

Shows:
- ✅ Order information (number, status, amount, payment)
- ✅ Customer information (name, email, phone)
- ✅ Shipping and billing addresses
- ✅ Complete item list with images
- ✅ Notes from customer
- ✅ Rejection reason (if rejected)
- ✅ Approve/Reject buttons (if status = draft)

---

## 📊 Order Number Format

### Draft Orders
```
Format: DRAFT-YYYYMMDD-XXXXX
Example: DRAFT-20251015-00001

Where:
- DRAFT = Prefix for draft orders
- YYYYMMDD = Date (20251015 = Oct 15, 2025)
- XXXXX = Sequential number (00001, 00002, etc.)
```

### Regular Orders (After Approval)
```
Format: ORD-YYYYMMDD-XXXXX
Example: ORD-20251015-00001

Converted from: DRAFT-20251015-00001
```

---

## 🔐 Security Considerations

### API Endpoints

- All use Supabase service role key
- Require admin authentication (implement in mobile app)
- Validate all input data
- Prevent SQL injection
- Check user permissions

### Data Validation

- User ID must exist in users table
- Products must exist and be valid
- Quantities must be positive
- Prices must be valid decimals
- Required fields checked

---

## 📱 Mobile App Integration Guide

### 1. Check Stock Availability

```typescript
async function checkProductStock(variantId: string, quantity: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('quantity')
    .eq('id', variantId)
    .single();
    
  if (error || !data) return false;
  
  return data.quantity >= quantity;
}
```

### 2. Show Draft Order Option

```typescript
// In your checkout screen
if (!hasEnoughStock) {
  showAlert({
    title: "Out of Stock",
    message: "This item is currently unavailable. Would you like to place a draft order? We'll notify you when it's back in stock.",
    buttons: [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Place Draft Order",
        onPress: () => createDraftOrder()
      }
    ]
  });
}
```

### 3. Create Draft Order

```typescript
async function createDraftOrder() {
  try {
    const response = await fetch(`${API_URL}/api/orders/draft/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`, // Add auth if needed
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        items: cartItems.map(item => ({
          product_id: item.productId,
          product_variant_id: item.variantId,
          product_name: item.name,
          product_sku: item.sku,
          product_image: item.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_method: 'COD', // or user selected method
        notes: 'Order placed for out-of-stock items',
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Show success screen
      navigation.navigate('DraftOrderConfirmation', {
        orderNumber: result.draft_order.order_number
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to place draft order');
  }
}
```

### 4. Draft Order Confirmation Screen

```typescript
function DraftOrderConfirmationScreen({ orderNumber }) {
  return (
    <View style={styles.container}>
      <Icon name="clock" size={80} color="#F59E0B" />
      <Text style={styles.title}>Draft Order Placed!</Text>
      <Text style={styles.orderNumber}>{orderNumber}</Text>
      <Text style={styles.message}>
        Your order is pending approval. We'll notify you once the admin reviews and approves your order.
      </Text>
      <Text style={styles.submessage}>
        This may take 24-48 hours. We'll restock the items and process your order as soon as possible.
      </Text>
      <Button 
        title="View My Orders" 
        onPress={() => navigation.navigate('MyOrders')}
      />
    </View>
  );
}
```

### 5. Show Draft Orders in User's Order History

```typescript
async function fetchUserOrders(userId: string) {
  // Fetch regular orders
  const { data: regularOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  // Fetch draft orders
  const { data: draftOrders } = await supabase
    .from('customer_draft_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return {
    regular: regularOrders || [],
    draft: draftOrders || []
  };
}

// In your orders list
function OrdersList() {
  return (
    <>
      {/* Draft Orders Section */}
      {draftOrders.length > 0 && (
        <>
          <SectionHeader title="Draft Orders (Pending Approval)" />
          {draftOrders.map(order => (
            <OrderCard 
              key={order.id}
              order={order}
              isDraft={true}
              statusColor="amber"
            />
          ))}
        </>
      )}
      
      {/* Regular Orders Section */}
      <SectionHeader title="Confirmed Orders" />
      {regularOrders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </>
  );
}
```

---

## 🔔 Notification System (Recommended)

### When Draft Order is Approved

Send notification to customer:

```typescript
// In mobile app - listen for draft order status changes
supabase
  .channel('draft_order_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'customer_draft_orders',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      if (payload.new.status === 'approved') {
        sendPushNotification({
          title: 'Order Approved! 🎉',
          body: `Your draft order ${payload.new.order_number} has been approved and is being processed.`
        });
      } else if (payload.new.status === 'rejected') {
        sendPushNotification({
          title: 'Order Update',
          body: `Your draft order ${payload.new.order_number} could not be fulfilled. ${payload.new.rejection_reason || ''}`
        });
      }
    }
  )
  .subscribe();
```

---

## 🧪 Testing Guide

### Test Scenario 1: Create Draft Order

**Admin Panel:**
1. Go to Order Management
2. Click "Draft Orders" tab
3. Should be empty initially

**Mobile App:**
1. Try to order out-of-stock product
2. Confirm draft order creation
3. Submit order

**Admin Panel:**
1. Refresh Order Management
2. Click "Draft Orders" tab
3. New draft order should appear
4. ✅ Success if order visible

### Test Scenario 2: Approve Draft Order

**Admin Panel:**
1. Click "Draft Orders" tab
2. Find a draft order (status = draft)
3. Click Approve button (✅)
4. Confirm approval
5. Order should disappear from draft orders
6. Click "Regular Orders" tab
7. Order should appear as regular order
8. ✅ Success if converted properly

### Test Scenario 3: Reject Draft Order

**Admin Panel:**
1. Click "Draft Orders" tab
2. Find a draft order
3. Click Reject button (❌)
4. Enter rejection reason (e.g., "Product discontinued")
5. Confirm rejection
6. Order status should change to "rejected"
7. Click "View" to see rejection reason
8. ✅ Success if rejection reason visible

### Test Scenario 4: Delete Draft Order

**Admin Panel:**
1. Click "Draft Orders" tab
2. Click Delete button (🗑️)
3. Confirm deletion
4. Order should be removed
5. ✅ Success if order deleted

---

## 📈 Benefits

### For Business
✅ **Capture demand** - Track interest in out-of-stock items  
✅ **Better inventory** - Know what to restock  
✅ **Customer retention** - Don't lose sales to competitors  
✅ **Pre-orders** - Take orders before stock arrives  
✅ **Data insights** - Understand popular products  

### For Customers
✅ **Convenience** - Order anytime, even when out of stock  
✅ **Priority** - Get notified when items available  
✅ **No hassle** - Don't have to keep checking stock  
✅ **Transparency** - Know order status clearly  

### For Admins
✅ **Control** - Review before committing  
✅ **Flexibility** - Approve or reject as needed  
✅ **Organization** - Separate from regular orders  
✅ **Records** - Keep history of all draft orders  

---

## 🐛 Troubleshooting

### Draft orders not appearing

**Check:**
1. Migration ran successfully
2. Tables exist in Supabase
3. Mobile app is hitting correct API endpoint
4. User ID is valid

### Cannot approve draft order

**Check:**
1. Order status is 'draft' (not approved/rejected)
2. All required data is present
3. API endpoint is accessible
4. Check browser console for errors

### Approved order not in regular orders

**Check:**
1. Refresh the page
2. Click "Regular Orders" tab
3. Check Supabase `orders` table directly
4. Verify approval API completed successfully

---

## 🔄 Order Lifecycle

### Complete Flow

```
CUSTOMER PLACES ORDER (Out of Stock)
              ↓
        DRAFT ORDER CREATED
    (customer_draft_orders table)
              ↓
        Status: "draft"
              ↓
    ADMIN REVIEWS IN PANEL
              ↓
        ┌─────────────┐
        │   Decision  │
        └─────────────┘
              ↓
    ┌─────────────────────┐
    │                     │
 APPROVE              REJECT
    │                     │
    ↓                     ↓
Convert to          Status: "rejected"
Regular Order       Reason saved
    │               Customer notified
    ↓
orders table
Status: "pending"
    │
    ↓
Process normally
(shipping, delivery, etc.)
```

---

## 📊 Database Relationships

```
users
  ↓ (user_id)
customer_draft_orders
  ↓ (draft_order_id)
customer_draft_order_items
  ↓ (product_id, product_variant_id)
products & product_variants
```

---

## ✅ Implementation Checklist

### Database Setup
- [ ] Run migration `002_create_customer_draft_orders.sql`
- [ ] Verify tables created in Supabase
- [ ] Check indexes created
- [ ] Test order number generation function

### Admin Panel
- [ ] Order Management shows two tabs
- [ ] Draft Orders tab displays correctly
- [ ] Approve button works
- [ ] Reject button works
- [ ] Delete button works
- [ ] View details modal works
- [ ] Tab counter shows correct numbers

### Mobile App
- [ ] Detect out-of-stock products
- [ ] Show draft order option to user
- [ ] Create draft order via API
- [ ] Show confirmation screen
- [ ] Display draft orders in user's order history
- [ ] Listen for status updates (notifications)

### Testing
- [ ] Create draft order from mobile app
- [ ] Verify appears in admin panel
- [ ] Test approve functionality
- [ ] Test reject functionality
- [ ] Test delete functionality
- [ ] Verify notifications work
- [ ] Test edge cases

---

## 🎓 Best Practices

### For Admins

1. **Review Regularly**
   - Check draft orders daily
   - Don't keep customers waiting too long

2. **Clear Communication**
   - Use clear rejection reasons
   - Be specific about why order can't be fulfilled

3. **Batch Processing**
   - Approve multiple orders at once when restocking
   - More efficient workflow

4. **Keep Records**
   - Don't delete draft orders immediately
   - Useful for demand analysis

### For Mobile App Integration

1. **Clear Messaging**
   - Explain what draft order means
   - Set expectations on approval time

2. **Stock Checks**
   - Always check stock before allowing regular order
   - Only offer draft for truly out-of-stock items

3. **User Notifications**
   - Notify on approval immediately
   - Notify on rejection with helpful message

4. **Order History**
   - Show draft orders separately
   - Clear status indicators

---

## 📞 Support

### Files Created
- `migrations/002_create_customer_draft_orders.sql` - Database setup
- `app/api/orders/draft/create/route.ts` - Create draft order API
- `app/api/orders/draft/approve/route.ts` - Approve draft order API
- `app/api/orders/draft/reject/route.ts` - Reject draft order API

### Files Modified
- `app/admin/OrderManagement/page.tsx` - Added draft orders UI

### Documentation
- `DRAFT_ORDER_FEATURE.md` - This file

---

## 🎉 Summary

You now have a complete draft order system that:

✅ **Captures out-of-stock orders** from mobile app  
✅ **Shows in admin panel** for review  
✅ **Allows approve/reject** with one click  
✅ **Converts to regular order** when approved  
✅ **Maintains records** of all draft orders  
✅ **Professional UI** with tabs and filters  

**Next Steps:**
1. Run the database migration
2. Test in admin panel
3. Integrate with mobile app
4. Set up notifications

Happy order management! 🚀📦✨

