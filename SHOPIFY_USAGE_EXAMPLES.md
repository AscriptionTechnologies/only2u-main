# 🛍️ Shopify Sync - Usage Examples

## Quick Reference

Your Shopify sync server is running on **port 4001**.

Use the utility functions in `lib/shopifySync.ts` to easily integrate with your app.

---

## 📱 Usage Examples

### 1. Basic Order Sync

```typescript
import { syncOrderToShopify } from '@/lib/shopifySync';

// After creating an order
const result = await syncOrderToShopify('ord_123', [
  { sku: 'SKU-RED-42', quantity: 2 },
  { sku: 'SKU-BLUE-38', quantity: 1 }
]);

if (result.success) {
  console.log('✅ Synced with Shopify');
} else {
  console.error('❌ Sync failed:', result.error);
}
```

### 2. In Order Management Page

```typescript
// app/admin/OrderManagement/page.tsx
import { syncOrderAfterCreation } from '@/lib/shopifySync';
import { supabase } from '@/lib/supabase';

const createOrder = async (orderData) => {
  try {
    // 1. Create order in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: orderData.customerId,
        total_amount: orderData.total,
        items: orderData.items
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Sync with Shopify (non-blocking)
    syncOrderAfterCreation(order, { silent: false })
      .catch(err => console.error('Shopify sync failed:', err));

    return { success: true, order };
  } catch (error) {
    return { success: false, error };
  }
};
```

### 3. With Error Handling

```typescript
import { syncOrderAfterCreation } from '@/lib/shopifySync';

const handleOrderCreation = async (order) => {
  const result = await syncOrderAfterCreation(order, {
    throwOnError: false,  // Don't throw, just return error
    silent: false         // Log to console
  });

  if (!result.success) {
    // Order created, but sync failed
    // Show warning to admin
    alert(`Order created but Shopify sync failed: ${result.error}`);
    
    // Could retry later or log for manual review
    await logFailedSync(order.id, result.error);
  } else {
    alert('Order created and synced with Shopify successfully!');
  }
};
```

### 4. Check Server Health Before Sync

```typescript
import { isShopifySyncHealthy, syncOrderToShopify } from '@/lib/shopifySync';

const syncOrder = async (orderId, items) => {
  // Check if server is running
  const isHealthy = await isShopifySyncHealthy();
  
  if (!isHealthy) {
    console.warn('Shopify sync server is offline');
    // Show warning but don't block order
    return { success: false, error: 'Sync server unavailable' };
  }

  // Server is healthy, proceed with sync
  return await syncOrderToShopify(orderId, items);
};
```

### 5. Batch Sync (Reconciliation)

```typescript
import { batchSyncOrders } from '@/lib/shopifySync';
import { supabase } from '@/lib/supabase';

const reconcileOrders = async () => {
  // Get recent orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Batch sync
  const results = await batchSyncOrders(orders, {
    delayMs: 100,        // 100ms between requests
    stopOnError: false,  // Continue even if one fails
    silent: false        // Show logs
  });

  const succeeded = results.filter(r => r.success).length;
  console.log(`Synced ${succeeded}/${orders.length} orders`);
  
  return results;
};
```

### 6. In Draft Order Flow

```typescript
// app/admin/DraftOrder/page.tsx
import { syncOrderAfterCreation } from '@/lib/shopifySync';

const convertDraftToOrder = async (draftOrder) => {
  try {
    // 1. Convert draft to order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        ...draftOrder,
        status: 'confirmed'
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Delete draft
    await supabase
      .from('customer_draft_orders')
      .delete()
      .eq('id', draftOrder.id);

    // 3. Sync inventory with Shopify
    const syncResult = await syncOrderAfterCreation(order, {
      throwOnError: false
    });

    if (!syncResult.success) {
      // Log but don't block
      console.error('Shopify sync failed:', syncResult.error);
    }

    return { success: true, order };
  } catch (error) {
    return { success: false, error };
  }
};
```

### 7. With Toast Notifications

```typescript
import { syncOrderAfterCreation } from '@/lib/shopifySync';
import { toast } from 'react-hot-toast'; // or your toast library

const createOrderWithNotifications = async (orderData) => {
  const toastId = toast.loading('Creating order...');

  try {
    // Create order
    const order = await createOrderInDatabase(orderData);
    toast.loading('Syncing with Shopify...', { id: toastId });

    // Sync with Shopify
    const syncResult = await syncOrderAfterCreation(order);

    if (syncResult.success) {
      toast.success('Order created and synced!', { id: toastId });
    } else {
      toast.warning(
        `Order created but sync failed: ${syncResult.error}`,
        { id: toastId }
      );
    }

    return order;
  } catch (error) {
    toast.error('Failed to create order', { id: toastId });
    throw error;
  }
};
```

### 8. React Hook for Sync Status

```typescript
// hooks/useShopifySync.ts
import { useState, useEffect } from 'react';
import { isShopifySyncHealthy } from '@/lib/shopifySync';

export function useShopifySync() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      setIsChecking(true);
      const healthy = await isShopifySyncHealthy();
      setIsHealthy(healthy);
      setIsChecking(false);
    };

    checkHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, isChecking };
}

// Usage in component
function OrderManagement() {
  const { isHealthy, isChecking } = useShopifySync();

  return (
    <div>
      <div className="status-indicator">
        {isChecking ? (
          <span>Checking Shopify sync...</span>
        ) : isHealthy ? (
          <span className="text-green-600">✅ Shopify sync active</span>
        ) : (
          <span className="text-red-600">❌ Shopify sync offline</span>
        )}
      </div>
      
      {/* Rest of your component */}
    </div>
  );
}
```

### 9. Middleware for Automatic Sync

```typescript
// middleware/shopifySync.ts
import { syncOrderAfterCreation } from '@/lib/shopifySync';

export async function withShopifySync<T extends { id: string }>(
  operation: () => Promise<T>,
  extractItems: (result: T) => Array<{ sku: string; quantity: number }>
): Promise<T> {
  // Execute the operation (create order, etc.)
  const result = await operation();

  // Sync in background (don't await)
  syncOrderAfterCreation(
    {
      id: result.id,
      items: extractItems(result)
    },
    { silent: true }
  ).catch(err => {
    console.error('Background Shopify sync failed:', err);
    // Could log to external service or database
  });

  return result;
}

// Usage
const order = await withShopifySync(
  () => createOrderInDatabase(orderData),
  (order) => order.line_items
);
```

### 10. Admin Dashboard Widget

```typescript
// components/ShopifySyncStatus.tsx
import { useEffect, useState } from 'react';
import { isShopifySyncHealthy, getShopifySyncUrl } from '@/lib/shopifySync';

export function ShopifySyncStatus() {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      const healthy = await isShopifySyncHealthy();
      setStatus(healthy ? 'healthy' : 'error');
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Shopify Sync Status
      </h3>
      
      <div className="flex items-center gap-2">
        {status === 'checking' && (
          <>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Checking...</span>
          </>
        )}
        
        {status === 'healthy' && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-green-700">Active & Syncing</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm text-red-700">Offline</span>
          </>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Server: {getShopifySyncUrl()}
      </p>
    </div>
  );
}

// Add to Dashboard
import { ShopifySyncStatus } from '@/components/ShopifySyncStatus';

function Dashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Other widgets */}
      <ShopifySyncStatus />
    </div>
  );
}
```

---

## 🔧 Configuration

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SHOPIFY_SYNC_URL=http://localhost:4001
```

For production:
```env
NEXT_PUBLIC_SHOPIFY_SYNC_URL=https://your-shopify-sync-server.com
```

---

## 🧪 Testing

### Test in Browser Console

```javascript
// Open browser console on your admin panel

// Test health
fetch('http://localhost:4001/health')
  .then(r => r.json())
  .then(console.log);

// Test order sync
fetch('http://localhost:4001/orders/only2u', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'test_001',
    lineItems: [{ sku: 'TEST-SKU', quantity: 1 }]
  })
})
  .then(r => r.json())
  .then(console.log);
```

---

## 📊 Best Practices

### 1. **Non-Blocking Sync**
Don't block order creation on Shopify sync:

```typescript
// ✅ Good - Don't await sync
createOrder(data).then(order => {
  syncOrderAfterCreation(order).catch(console.error);
});

// ❌ Bad - Blocking user
await createOrder(data);
await syncOrderAfterCreation(order); // User waits for Shopify
```

### 2. **Error Handling**
Always handle sync failures gracefully:

```typescript
const result = await syncOrderAfterCreation(order, {
  throwOnError: false // Don't throw errors
});

if (!result.success) {
  // Log for admin review
  await logFailedSync(order.id, result.error);
}
```

### 3. **Health Checks**
Check server health before important operations:

```typescript
const isHealthy = await isShopifySyncHealthy();
if (!isHealthy) {
  showWarning('Shopify sync is offline. Order will be created locally.');
}
```

### 4. **Retry Logic**
Implement retry for transient failures:

```typescript
async function syncWithRetry(order, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await syncOrderAfterCreation(order);
    if (result.success) return result;
    
    // Wait before retry (exponential backoff)
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  
  throw new Error('Sync failed after retries');
}
```

---

## 🚀 Ready to Use!

Import the utilities and start syncing:

```typescript
import {
  syncOrderToShopify,
  syncOrderAfterCreation,
  isShopifySyncHealthy,
  batchSyncOrders
} from '@/lib/shopifySync';
```

Your orders will automatically sync with Shopify! 🎉

---

## 📖 See Also

- `SHOPIFY_SYNC_SETUP.md` - Complete setup guide
- `SHOPIFY_INTEGRATION_QUICK_START.md` - Quick start guide
- `lib/shopifySync.ts` - Utility functions source code

