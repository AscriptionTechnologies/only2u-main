# 📱 Mobile App Integration - Draft Orders

## For Mobile App Developers

This guide shows how to integrate the draft order system into your React Native mobile app.

---

## 🎯 Overview

When a product is **out of stock**, instead of preventing the order:
1. Allow customer to place a **draft order**
2. Draft order goes to admin for approval
3. Customer is notified when approved/rejected

---

## 📋 API Endpoint

### Create Draft Order

**Endpoint:** `POST /api/orders/draft/create`

**Base URL:** Your admin panel URL (e.g., `https://admin.only2u.com`)

**Full URL:** `https://admin.only2u.com/api/orders/draft/create`

---

## 🔧 Implementation

### Step 1: Check Stock Availability

```typescript
async function checkProductAvailability(
  productVariantId: string,
  requestedQuantity: number
): Promise<{ available: boolean; currentStock: number }> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('quantity')
    .eq('id', productVariantId)
    .single();

  if (error || !data) {
    return { available: false, currentStock: 0 };
  }

  return {
    available: data.quantity >= requestedQuantity,
    currentStock: data.quantity
  };
}
```

### Step 2: Show Draft Order Option

```typescript
// In your checkout/cart screen

const handleCheckout = async () => {
  // Check stock for all items
  const stockChecks = await Promise.all(
    cartItems.map(item => 
      checkProductAvailability(item.variantId, item.quantity)
    )
  );

  const outOfStockItems = cartItems.filter((item, index) => 
    !stockChecks[index].available
  );

  if (outOfStockItems.length > 0) {
    // Some items are out of stock
    Alert.alert(
      'Out of Stock Items',
      `${outOfStockItems.length} item(s) are currently unavailable. Would you like to place a draft order? We'll notify you when approved.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Place Draft Order',
          onPress: () => createDraftOrder(cartItems)
        }
      ]
    );
  } else {
    // All items in stock - create regular order
    await createRegularOrder(cartItems);
  }
};
```

### Step 3: Create Draft Order Function

```typescript
async function createDraftOrder(items: CartItem[]) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/draft/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization if needed
        // 'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        items: items.map(item => ({
          product_id: item.productId,
          product_variant_id: item.variantId,
          product_name: item.name,
          product_sku: item.sku,
          product_image: item.images[0], // First image
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        shipping_address: userShippingAddress,
        billing_address: userBillingAddress,
        payment_method: selectedPaymentMethod, // 'COD', 'Card', etc.
        notes: 'Order placed for out-of-stock items',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create draft order');
    }

    // Success! Show confirmation
    Alert.alert(
      'Draft Order Placed! 🎉',
      `Order Number: ${result.draft_order.order_number}\n\nYour order is pending admin approval. We'll notify you within 24-48 hours.`,
      [
        {
          text: 'View Order',
          onPress: () => navigation.navigate('OrderDetails', {
            orderId: result.draft_order.id,
            isDraft: true
          })
        },
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );

    // Clear cart
    clearCart();

    // Navigate to confirmation screen
    navigation.navigate('DraftOrderConfirmation', {
      orderNumber: result.draft_order.order_number,
      amount: result.draft_order.total_amount
    });

  } catch (error) {
    console.error('Error creating draft order:', error);
    Alert.alert('Error', 'Failed to place draft order. Please try again.');
  }
}
```

### Step 4: Create Confirmation Screen

```typescript
// DraftOrderConfirmationScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function DraftOrderConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderNumber, amount } = route.params;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⏳</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Draft Order Placed!</Text>

      {/* Order Number */}
      <View style={styles.orderNumberContainer}>
        <Text style={styles.orderNumberLabel}>Order Number</Text>
        <Text style={styles.orderNumber}>{orderNumber}</Text>
      </View>

      {/* Amount */}
      <Text style={styles.amount}>₹{amount}</Text>

      {/* Message */}
      <Text style={styles.message}>
        Your order is pending admin approval
      </Text>
      
      <Text style={styles.submessage}>
        We'll notify you within 24-48 hours once the admin reviews your order. 
        The items will be restocked and your order will be processed.
      </Text>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>AWAITING APPROVAL</Text>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <Text style={styles.infoText}>
          • Admin reviews your order{'\n'}
          • If approved: Order is processed{'\n'}
          • If rejected: You'll be notified why{'\n'}
          • Track status in "My Orders"
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity 
        style={styles.primaryButton}
        onPress={() => navigation.navigate('MyOrders')}
      >
        <Text style={styles.primaryButtonText}>View My Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  orderNumberContainer: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  orderNumberLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 5,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F53F7A',
    marginBottom: 15,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 10,
  },
  submessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statusBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#F53F7A',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

### Step 5: Display in Order History

```typescript
// MyOrdersScreen.tsx

async function fetchAllOrders() {
  // Fetch regular orders
  const { data: regularOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  // Fetch draft orders
  const { data: draftOrders } = await supabase
    .from('customer_draft_orders')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  return {
    regular: regularOrders || [],
    draft: draftOrders || []
  };
}

function MyOrdersScreen() {
  return (
    <ScrollView>
      {/* Draft Orders Section */}
      {draftOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Draft Orders (Pending Approval)
          </Text>
          {draftOrders.map(order => (
            <DraftOrderCard 
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('DraftOrderDetails', { orderId: order.id })}
            />
          ))}
        </View>
      )}

      {/* Regular Orders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Orders</Text>
        {regularOrders.map(order => (
          <OrderCard 
            key={order.id}
            order={order}
            onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function DraftOrderCard({ order, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.draftCard}>
      <View style={styles.draftBadge}>
        <Text style={styles.draftBadgeText}>DRAFT</Text>
      </View>
      
      <Text style={styles.orderNumber}>{order.order_number}</Text>
      <Text style={styles.orderAmount}>₹{order.total_amount}</Text>
      
      <View style={[
        styles.statusBadge,
        order.status === 'approved' && styles.approvedBadge,
        order.status === 'rejected' && styles.rejectedBadge
      ]}>
        <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
      </View>
      
      {order.status === 'draft' && (
        <Text style={styles.waitingText}>⏳ Awaiting admin approval</Text>
      )}
      
      {order.status === 'approved' && (
        <Text style={styles.approvedText}>✅ Approved & processing</Text>
      )}
      
      {order.status === 'rejected' && (
        <Text style={styles.rejectedText}>❌ {order.rejection_reason || 'Order declined'}</Text>
      )}
      
      <Text style={styles.orderDate}>
        {new Date(order.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}
```

---

## 🔔 Real-Time Notifications

### Setup Supabase Realtime

```typescript
import { useEffect } from 'react';
import { supabase } from './supabase';

function useOrderStatusUpdates(userId: string) {
  useEffect(() => {
    // Subscribe to draft order updates
    const channel = supabase
      .channel('draft_order_updates')
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

  const handleDraftOrderUpdate = (payload: any) => {
    const { old: oldOrder, new: newOrder } = payload;

    // Draft order approved
    if (oldOrder.status === 'draft' && newOrder.status === 'approved') {
      sendPushNotification({
        title: '🎉 Order Approved!',
        body: `Your order ${newOrder.order_number} has been approved and is now being processed.`,
        data: { orderId: newOrder.id, type: 'order_approved' }
      });

      // Refresh orders list
      refreshOrders();
      
      // Show in-app notification
      showToast('Order approved! Check your orders.');
    }

    // Draft order rejected
    if (oldOrder.status === 'draft' && newOrder.status === 'rejected') {
      sendPushNotification({
        title: 'Order Update',
        body: `Order ${newOrder.order_number} could not be fulfilled. ${newOrder.rejection_reason || 'Please contact support for details.'}`,
        data: { orderId: newOrder.id, type: 'order_rejected' }
      });

      // Refresh orders list
      refreshOrders();
      
      // Show in-app notification
      showToast('Draft order was declined. See details in My Orders.');
    }
  };
}

// Use in your app
function App() {
  const { user } = useAuth();
  
  useOrderStatusUpdates(user?.id);
  
  return <YourAppComponents />;
}
```

---

## 📦 Complete Example

### Full Checkout Flow

```typescript
// CheckoutScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

export default function CheckoutScreen({ route, navigation }) {
  const { cartItems } = route.params;
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    setLoading(true);

    try {
      // 1. Check stock for all items
      const stockStatuses = await Promise.all(
        cartItems.map(item =>
          checkProductAvailability(item.variantId, item.quantity)
        )
      );

      // 2. Separate in-stock and out-of-stock items
      const inStockItems = [];
      const outOfStockItems = [];

      cartItems.forEach((item, index) => {
        if (stockStatuses[index].available) {
          inStockItems.push(item);
        } else {
          outOfStockItems.push(item);
        }
      });

      // 3. Handle based on stock availability
      if (outOfStockItems.length === 0) {
        // All items in stock - create regular order
        await createRegularOrder(inStockItems);
        navigation.navigate('OrderSuccess');
      } else if (inStockItems.length === 0) {
        // All items out of stock - offer draft order
        Alert.alert(
          'Out of Stock',
          'All items in your cart are currently out of stock. Would you like to place a draft order?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Place Draft Order',
              onPress: async () => {
                await createDraftOrder(cartItems);
              }
            }
          ]
        );
      } else {
        // Mixed - some in stock, some out
        Alert.alert(
          'Partial Stock Availability',
          `${inStockItems.length} item(s) available, ${outOfStockItems.length} item(s) out of stock.\n\nChoose an option:`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Order Available Items Only',
              onPress: async () => {
                await createRegularOrder(inStockItems);
                navigation.navigate('OrderSuccess');
              }
            },
            {
              text: 'Draft Order for All',
              onPress: async () => {
                await createDraftOrder(cartItems);
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Your checkout UI */}
      <TouchableOpacity 
        style={styles.checkoutButton}
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        <Text style={styles.checkoutButtonText}>
          {loading ? 'Processing...' : 'Place Order'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🎨 UI Components

### Draft Order Card (for Order List)

```typescript
function DraftOrderCard({ order }: { order: DraftOrder }) {
  return (
    <View style={styles.card}>
      {/* Header with draft badge */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>DRAFT</Text>
        </View>
      </View>

      {/* Amount */}
      <Text style={styles.amount}>₹{order.total_amount}</Text>

      {/* Status */}
      <View style={[
        styles.statusContainer,
        order.status === 'draft' && styles.statusDraft,
        order.status === 'approved' && styles.statusApproved,
        order.status === 'rejected' && styles.statusRejected
      ]}>
        <Text style={styles.statusText}>
          {order.status === 'draft' && '⏳ Awaiting Approval'}
          {order.status === 'approved' && '✅ Approved'}
          {order.status === 'rejected' && `❌ Rejected: ${order.rejection_reason || 'N/A'}`}
        </Text>
      </View>

      {/* Date */}
      <Text style={styles.date}>
        {new Date(order.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  draftBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F53F7A',
    marginBottom: 10,
  },
  statusContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusDraft: {
    backgroundColor: '#fef3c7',
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 13,
    color: '#1f2937',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
});
```

---

## 🧪 Testing Checklist

### Admin Panel
- [ ] Run database migration
- [ ] Order Management shows two tabs
- [ ] Draft Orders tab displays
- [ ] Can create test draft order (manually in DB)
- [ ] Can view draft order details
- [ ] Can approve draft order
- [ ] Approved order appears in Regular Orders
- [ ] Can reject draft order
- [ ] Rejection reason saves correctly
- [ ] Can delete draft order

### Mobile App
- [ ] Stock check function works
- [ ] Out-of-stock detection works
- [ ] Draft order prompt appears
- [ ] Can create draft order via API
- [ ] Confirmation screen shows
- [ ] Order appears in user's order list
- [ ] Draft orders shown separately
- [ ] Real-time updates work (if implemented)
- [ ] Push notifications work (if implemented)

---

## 🚀 Deployment Steps

### 1. Database (Production)
```sql
-- Run in production Supabase
-- migrations/002_create_customer_draft_orders.sql
```

### 2. Admin Panel (No Changes Needed)
- Already updated and ready
- Just deploy latest code

### 3. Mobile App
- Update checkout logic
- Add draft order handling
- Create confirmation screen
- Deploy new version

### 4. Testing
- Test on staging first
- Create test draft orders
- Verify approval/rejection flow
- Check notifications

---

## 📞 API Reference

### Create Draft Order
```
POST /api/orders/draft/create
Content-Type: application/json

Body: { user_id, items, shipping_address, billing_address, payment_method, notes }
Response: { success, draft_order, message }
```

### Approve Draft Order
```
POST /api/orders/draft/approve
Content-Type: application/json

Body: { draft_order_id, approved_by }
Response: { success, order, message }
```

### Reject Draft Order
```
POST /api/orders/draft/reject
Content-Type: application/json

Body: { draft_order_id, rejection_reason }
Response: { success, draft_order, message }
```

---

## 🎉 Summary

### What You Get

✅ **Mobile app can create draft orders** for out-of-stock items  
✅ **Admin panel shows draft orders** in separate tab  
✅ **Easy approve/reject** workflow  
✅ **Automatic conversion** to regular orders  
✅ **Complete tracking** and history  

### Integration is Simple

```typescript
// Mobile App (3 lines of code)
const result = await createDraftOrder(cartItems);
if (result.success) {
  showConfirmation(result.draft_order.order_number);
}
```

### Admin Panel Ready
- Two tabs: Draft Orders | Regular Orders
- One-click approve/reject
- Full order details
- Professional UI

---

For complete documentation, see `DRAFT_ORDER_FEATURE.md`

Happy coding! 🚀📱✨

