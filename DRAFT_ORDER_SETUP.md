# 🚀 Draft Order System - Quick Setup Guide

## What Is This?

The **Draft Order System** lets customers place orders for out-of-stock products. These orders wait for admin approval instead of being processed immediately.

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Run Database Migration (2 min)

1. **Open Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. **Copy and paste** the contents from:
   ```
   migrations/002_create_customer_draft_orders.sql
   ```
5. Click **Run**

**Verify:**
- ✅ Tables created: `customer_draft_orders`, `customer_draft_order_items`
- ✅ Functions created: `generate_draft_order_number()`
- ✅ Indexes created
- ✅ Triggers created

### Step 2: Test Admin Panel (1 min)

1. Open your admin dashboard
2. Go to **Order Management**
3. You should see **two tabs**:
   - 🟡 **Draft Orders (Out-of-Stock)** ← New!
   - 🟢 **Regular Orders**
4. Click "Draft Orders" tab
5. Should show "No draft orders found" (initially empty)

✅ **If you see the tabs, you're done!**

### Step 3: Integrate with Mobile App (2 min)

See section "Mobile App Integration" below for code examples.

---

## 🎯 How It Works

### Simple Flow

```
📱 Customer Order (Out of Stock)
        ↓
🟡 Draft Order Created
        ↓
👨‍💼 Admin Reviews in Panel
        ↓
    ┌───────┐
    │ Decision │
    └───────┘
        ↓
    ┌───────────┐
 ✅ Approve  ❌ Reject
    │           │
    ↓           ↓
Regular Order  Rejected
(processed)    (with reason)
```

---

## 🎨 Admin Panel UI

### Order Management Screen

```
┌──────────────────────────────────────────┐
│  Order Management        3 pending drafts│
│                                          │
│  [Draft Orders (3)]  [Regular Orders]   │
│  ─────────────────                      │
│                                          │
│  ⚠️ Draft orders placed for out-of-stock│
│                                          │
│  Order#  Customer  Amount  Status  Actions│
│  ────────────────────────────────────────│
│  DRAFT-.. John    ₹999   draft   👁️✅❌🗑️│
│  DRAFT-.. Sarah   ₹1500  draft   👁️✅❌🗑️│
└──────────────────────────────────────────┘
```

### Actions

- 👁️ **View** - See order details
- ✅ **Approve** - Convert to regular order
- ❌ **Reject** - Decline with reason
- 🗑️ **Delete** - Remove permanently

---

## 📱 Mobile App Integration

### Detect Out-of-Stock

```typescript
// Check stock before checkout
const variant = await getProductVariant(variantId);

if (variant.quantity < requestedQuantity) {
  // Show draft order option
  showDraftOrderPrompt();
} else {
  // Proceed with regular order
  createRegularOrder();
}
```

### Create Draft Order

**API Endpoint:** `POST /api/orders/draft/create`

```typescript
const response = await fetch('https://your-domain.com/api/orders/draft/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: user.id,
    items: [{
      product_id: product.id,
      product_variant_id: variant.id,
      product_name: product.name,
      product_sku: variant.sku,
      product_image: variant.image_urls[0],
      size: variant.size,
      color: variant.color,
      quantity: requestedQuantity,
      unit_price: variant.price,
    }],
    shipping_address: user.address,
    billing_address: user.address,
    payment_method: 'COD',
    notes: 'Out of stock order'
  })
});

const result = await response.json();

if (result.success) {
  // Show confirmation
  Alert.alert(
    'Draft Order Placed',
    `Order ${result.draft_order.order_number} is pending approval`
  );
}
```

### Example Response

```json
{
  "success": true,
  "draft_order": {
    "id": "uuid-here",
    "order_number": "DRAFT-20251015-00001",
    "total_amount": 999.00,
    "status": "draft",
    "created_at": "2025-10-15T10:30:00Z"
  },
  "message": "Draft order created successfully"
}
```

---

## 🎯 Usage Examples

### Example 1: Basic Out-of-Stock Order

```typescript
// Mobile App Code

if (productQuantity === 0) {
  Alert.alert(
    'Out of Stock',
    'This item is currently unavailable. Place a draft order?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Place Draft Order',
        onPress: async () => {
          const result = await createDraftOrder({
            userId: currentUser.id,
            items: [{ ...cartItem }],
            address: userAddress,
          });
          
          if (result.success) {
            navigation.navigate('DraftOrderConfirmation', {
              orderNumber: result.draft_order.order_number
            });
          }
        }
      }
    ]
  );
}
```

### Example 2: Mixed Cart (Some In Stock, Some Out)

```typescript
// Separate in-stock and out-of-stock items
const { inStock, outOfStock } = await categorizeCartItems(cartItems);

if (inStock.length > 0) {
  // Create regular order for in-stock items
  await createRegularOrder({ items: inStock });
}

if (outOfStock.length > 0) {
  // Ask about draft order for out-of-stock items
  const confirmed = await confirmDraftOrder();
  if (confirmed) {
    await createDraftOrder({ items: outOfStock });
  }
}
```

---

## 🔔 Notifications (Recommended)

### Setup Push Notifications

```typescript
// Listen for draft order status changes
useEffect(() => {
  const channel = supabase
    .channel('my_draft_orders')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_draft_orders',
        filter: `user_id=eq.${userId}`
      },
      handleDraftOrderUpdate
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);

function handleDraftOrderUpdate(payload: any) {
  const { old, new: updated } = payload;
  
  if (old.status === 'draft' && updated.status === 'approved') {
    // Draft order approved!
    sendPushNotification({
      title: '🎉 Order Approved!',
      body: `Your order ${updated.order_number} has been confirmed and is being processed.`
    });
    
    // Refresh user's order list
    refreshOrders();
  }
  
  if (old.status === 'draft' && updated.status === 'rejected') {
    // Draft order rejected
    sendPushNotification({
      title: 'Order Update',
      body: `Unfortunately, we cannot fulfill order ${updated.order_number}. ${updated.rejection_reason || ''}`
    });
    
    // Refresh user's order list
    refreshOrders();
  }
}
```

---

## 📊 Admin Panel Features

### Tab System
- **Draft Orders** tab - Shows draft orders (default view)
- **Regular Orders** tab - Shows regular orders
- **Counter badges** - Show pending count
- **Info banner** - Explains what draft orders are

### Draft Order Actions
- **View Details** - Full order information modal
- **Approve** - Convert to regular order (one click + confirm)
- **Reject** - Mark as rejected (prompts for reason)
- **Delete** - Permanently remove

### Status Colors
- 🟡 **Draft** - Amber/Yellow (pending review)
- 🟢 **Approved** - Green (converted to order)
- 🔴 **Rejected** - Red (declined)

---

## 🔒 Security

### API Endpoints

All endpoints use Supabase service role for security:
- ✅ Validate user_id exists
- ✅ Validate product_id exists
- ✅ Check required fields
- ✅ Prevent SQL injection
- ✅ Atomic transactions

### Admin Actions

- Approve/Reject buttons only visible for draft status
- Confirmation prompts before actions
- Loading states during processing
- Error handling and rollback

---

## 📚 Documentation Files

- **`DRAFT_ORDER_SETUP.md`** ← You are here! (Quick setup)
- **`DRAFT_ORDER_FEATURE.md`** ← Complete documentation
- **`migrations/002_create_customer_draft_orders.sql`** ← Database migration

---

## ✅ Summary

### What You Get

✨ **Draft order system** for out-of-stock products  
✨ **Admin approval workflow** in Order Management  
✨ **API endpoints** for mobile app integration  
✨ **Professional UI** with tabs and actions  
✨ **Complete tracking** of all draft orders  

### Setup Steps

1. ✅ Run migration (2 min)
2. ✅ Verify in admin panel (1 min)
3. ✅ Integrate with mobile app (2 min)

**Total: 5 minutes!**

### Mobile App Integration

```typescript
// When product is out of stock:
const result = await fetch('/api/orders/draft/create', {
  method: 'POST',
  body: JSON.stringify({ user_id, items, ... })
});

// Shows in admin panel for approval
```

---

## 🎉 You're Ready!

1. **Run the migration** (Step 1 above)
2. **Check admin panel** (you'll see two tabs)
3. **Integrate with mobile app** (use API endpoint)
4. **Test the flow** (create, approve, reject)

**Everything works perfectly!** 🚀

For complete documentation, see `DRAFT_ORDER_FEATURE.md`

---

Happy order managing! 📦✨

