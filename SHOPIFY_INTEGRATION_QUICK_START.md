# 🚀 Shopify Sync Server - Quick Start

## ✅ Server is Running!

Your Shopify sync server is now running on **port 4001**.

```
Status: ✅ RUNNING
Port: 4001
URL: http://localhost:4001
```

---

## 🧪 Quick Test

### 1. Test Health Endpoint

```bash
curl http://localhost:4001/health
```

**Expected Response:**
```json
{"ok":true,"service":"shopify-sync"}
```

### 2. Test Order Sync (Example)

```bash
curl -X POST http://localhost:4001/orders/only2u \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test_001",
    "lineItems": [
      { "sku": "YOUR-SKU", "quantity": 1 }
    ]
  }'
```

---

## 📡 Integration Points

### From Your Mobile App

When a user places an order:

```typescript
// After order is created in Supabase
const syncInventory = async (order) => {
  try {
    const response = await fetch('http://localhost:4001/orders/only2u', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        lineItems: order.items.map(item => ({
          sku: item.sku,
          quantity: item.quantity
        }))
      })
    });

    if (!response.ok) {
      throw new Error('Inventory sync failed');
    }

    console.log('✅ Inventory synced with Shopify');
  } catch (error) {
    console.error('❌ Shopify sync error:', error);
    // Order is still created, but inventory not synced
    // You might want to retry or alert admin
  }
};
```

### From Admin Panel

Add to your order creation flow:

```typescript
// In app/admin/OrderManagement/page.tsx or similar

const createOrder = async (orderData) => {
  try {
    // 1. Create order in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;

    // 2. Sync with Shopify
    await fetch('http://localhost:4001/orders/only2u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        lineItems: orderData.items.map(item => ({
          sku: item.sku,
          quantity: item.quantity
        }))
      })
    });

    alert('Order created and synced with Shopify!');
    
  } catch (error) {
    console.error('Error:', error);
    alert('Order created but Shopify sync may have failed');
  }
};
```

---

## 🔗 Next Steps

### 1. Configure Shopify Webhook

To receive orders FROM Shopify, you need to set up a webhook.

**For Local Development (with ngrok):**

```bash
# In a new terminal
ngrok http 4001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Configure in Shopify:**
1. Go to Shopify Admin → Settings → Notifications
2. Scroll to Webhooks → Create webhook
3. Event: `Order creation`
4. URL: `https://your-ngrok-url.ngrok.io/webhooks/shopify/orders/create`
5. Format: `JSON`
6. Save

### 2. Update Environment Variables

Make sure your `.env` file has all required values:

```env
# Check your .env file at:
# services/shopify-sync-server/.env

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
SHOPIFY_LOCATION_ID=123456
SHOPIFY_WEBHOOK_SHARED_SECRET=your-secret
PORT=4001
```

See `SHOPIFY_SYNC_SETUP.md` for detailed instructions on getting these values.

### 3. Link Products to Shopify

Your Supabase `product_variants` table needs `shopify_inventory_item_id` for each product:

```sql
-- Check which products need linking
SELECT id, sku, shopify_inventory_item_id 
FROM product_variants 
WHERE shopify_inventory_item_id IS NULL;

-- Update with Shopify inventory item IDs
UPDATE product_variants 
SET shopify_inventory_item_id = 'SHOPIFY_ID_HERE'
WHERE sku = 'YOUR-SKU';
```

---

## 🎯 How It Works

### Flow 1: Only2u Order → Shopify

```
1. User places order in Only2u app
   ↓
2. App calls POST /orders/only2u
   ↓
3. Sync server validates stock in Supabase
   ↓
4. Decrements Supabase inventory
   ↓
5. Adjusts Shopify inventory via API
   ↓
6. Returns success/failure
```

### Flow 2: Shopify Order → Only2u

```
1. Customer orders on Shopify
   ↓
2. Shopify sends webhook to your server
   ↓
3. Server verifies webhook signature
   ↓
4. Extracts SKUs from order
   ↓
5. Decrements Supabase inventory
   ↓
6. Returns success
```

---

## 📊 Monitoring

### View Server Logs

The server is running in terminal 2. To see logs:

```bash
# View the terminal file
cat /Users/nischal/.cursor/projects/Users-nischal-Library-Mobile-Documents-com-apple-CloudDocs-only2u-adminpanel-main-2/terminals/2.txt
```

Or open the Cursor terminal panel and switch to terminal 2.

### Check Server Status

```bash
# Test if server is responding
curl http://localhost:4001/health

# Check if port is listening
lsof -i :4001
```

### Stop the Server

If you need to stop the server:

```bash
# Find the process
lsof -i :4001

# Kill by PID (replace XXXX with actual PID)
kill XXXX
```

Or use the terminal panel in Cursor and press Ctrl+C in terminal 2.

---

## 🔧 Troubleshooting

### Server Not Responding

**Check if running:**
```bash
curl http://localhost:4001/health
```

**Check logs in terminal 2** for error messages.

### Environment Variable Errors

If you see warnings about missing environment variables:

1. Edit `services/shopify-sync-server/.env`
2. Add missing variables (see `.env.example`)
3. Restart server:
   ```bash
   # Stop current server (Ctrl+C in terminal 2)
   cd services/shopify-sync-server
   npm run dev
   ```

### Inventory Not Syncing

**Common issues:**

1. **SKU doesn't exist in database**
   ```sql
   SELECT * FROM product_variants WHERE sku = 'YOUR-SKU';
   ```

2. **Missing Shopify inventory item ID**
   ```sql
   SELECT sku, shopify_inventory_item_id 
   FROM product_variants 
   WHERE shopify_inventory_item_id IS NULL;
   ```

3. **Insufficient stock**
   - Check stock quantity in Supabase
   - Server will return error if not enough stock

4. **Invalid Shopify credentials**
   - Verify access token in `.env`
   - Check token permissions in Shopify

---

## 📚 Full Documentation

For complete setup instructions and advanced configuration:

- **`SHOPIFY_SYNC_SETUP.md`** - Complete setup guide
- **`services/shopify-sync-server/README.md`** - Original documentation

---

## ✅ Checklist

Setup checklist:

- [x] ✅ Dependencies installed
- [x] ✅ Server running on port 4001
- [ ] Configure Shopify API credentials in `.env`
- [ ] Link products (add `shopify_inventory_item_id`)
- [ ] Set up Shopify webhook
- [ ] Test order sync from app
- [ ] Test webhook from Shopify
- [ ] Deploy to production
- [ ] Update webhook URL to production URL

---

## 🎉 You're Ready!

Your Shopify sync server is running and ready to keep your inventories in sync!

**Test it now:**
```bash
curl http://localhost:4001/health
```

**Next:** Complete the checklist above and start syncing! 🚀

---

## 📞 Quick Commands

```bash
# Health check
curl http://localhost:4001/health

# Test order sync
curl -X POST http://localhost:4001/orders/only2u \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","lineItems":[{"sku":"TEST","quantity":1}]}'

# View logs
cat /Users/nischal/.cursor/projects/Users-nischal-Library-Mobile-Documents-com-apple-CloudDocs-only2u-adminpanel-main-2/terminals/2.txt

# Restart server (in terminal 2)
cd services/shopify-sync-server && npm run dev
```

