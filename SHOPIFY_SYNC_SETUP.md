# 🛍️ Shopify Sync Server - Setup & Integration Guide

## 📋 Overview

The Shopify Sync Server is a Node.js + Express service that keeps your Only2u (Supabase) inventory synchronized with your Shopify store in real-time.

### How It Works

```
Only2u Order → Sync Server → Decrements Supabase → Adjusts Shopify
Shopify Order → Webhook → Sync Server → Decrements Supabase
```

**Supabase is the single source of truth** - Shopify always mirrors Only2u quantities.

## 🎯 Features

✅ **Two-way sync**: Handles orders from both platforms  
✅ **Real-time updates**: Instant inventory adjustments  
✅ **Webhook verification**: Secure Shopify webhook handling  
✅ **SKU-based matching**: Uses SKUs to sync inventory  
✅ **Error handling**: Validates stock before adjustments  
✅ **Health checks**: Monitor service status  

---

## 📋 Prerequisites

### 1. Database Requirements
Your Supabase `product_variants` table must have:
- `sku` (text) - Product SKU
- `quantity` (int) - Current stock quantity
- `shopify_inventory_item_id` (text, nullable) - Shopify inventory item ID

### 2. Shopify Requirements
- Shopify store with Admin API access
- API access token with inventory permissions
- Location ID for your inventory
- Webhook shared secret

---

## 🔑 Step 1: Get Shopify Credentials

### A. Get Access Token

1. **Go to Shopify Admin** → Settings → Apps and sales channels
2. Click **"Develop apps"** (or enable if needed)
3. Click **"Create an app"**
4. Name it: `Only2u Inventory Sync`
5. Go to **Configuration** tab
6. Under **Admin API access scopes**, enable:
   - ✅ `read_inventory`
   - ✅ `write_inventory`
   - ✅ `read_orders`
   - ✅ `read_products`
7. Click **"Install app"**
8. Copy the **Admin API access token** (starts with `shpat_`)

### B. Get Location ID

```bash
# Replace with your credentials
curl -X GET "https://YOUR-STORE.myshopify.com/admin/api/2024-01/locations.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN"
```

Copy the `id` from the response (usually your primary location).

### C. Get Webhook Secret

1. In Shopify Admin → Settings → Notifications
2. Scroll to **Webhooks**
3. You'll set this up after the server is running
4. For now, generate a random secret:

```bash
# Generate a random secret
openssl rand -base64 32
```

Save this - you'll use it when configuring the webhook.

---

## ⚙️ Step 2: Configure Environment Variables

### Create `.env` file

```bash
cd services/shopify-sync-server
```

Create a `.env` file with:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
SHOPIFY_LOCATION_ID=123456789
SHOPIFY_WEBHOOK_SHARED_SECRET=your-generated-secret

# Server Configuration
PORT=4001
LOG_LEVEL=info
```

### Finding Your Values

| Variable | Where to Find It |
|----------|------------------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → Service Role Key |
| `SHOPIFY_STORE_DOMAIN` | Your store URL (e.g., `mystore.myshopify.com`) |
| `SHOPIFY_ACCESS_TOKEN` | From Step 1A above |
| `SHOPIFY_LOCATION_ID` | From Step 1B above |
| `SHOPIFY_WEBHOOK_SHARED_SECRET` | Generated in Step 1C |

---

## 🚀 Step 3: Install Dependencies & Run

### Install Dependencies

```bash
cd services/shopify-sync-server
npm install
```

### Run Development Mode

```bash
npm run dev
```

You should see:
```
Shopify sync server listening on port 4001
```

### Run Production Mode

```bash
# Build first
npm run build

# Then start
npm start
```

---

## 🔗 Step 4: Configure Shopify Webhook

### A. Expose Your Server

For local development, use ngrok or similar:

```bash
# In a new terminal
ngrok http 4001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### B. Create Webhook in Shopify

1. Go to Shopify Admin → Settings → Notifications
2. Scroll to **Webhooks**
3. Click **"Create webhook"**
4. Configure:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: `https://your-server.com/webhooks/shopify/orders/create`
   - **API version**: `2024-01` (or latest)
5. Click **"Save"**

### C. Test the Webhook

Create a test order in Shopify and check your server logs.

---

## 📡 Step 5: Integrate with Your App

### A. From Only2u Mobile App

When an order is placed in your app:

```typescript
// After order is confirmed
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

if (response.ok) {
  console.log('Inventory synced with Shopify');
}
```

### B. From Admin Panel

Update your order creation flow:

```typescript
// In your order management code
import { syncOrderToShopify } from './shopifySync';

async function createOrder(orderData) {
  // 1. Create order in Supabase
  const order = await supabase.from('orders').insert(orderData);
  
  // 2. Sync inventory with Shopify
  try {
    await syncOrderToShopify(order);
  } catch (error) {
    console.error('Shopify sync failed:', error);
    // Order still created, but sync failed
  }
  
  return order;
}
```

---

## 📊 API Endpoints

### 1. Health Check

```bash
GET http://localhost:4001/health
```

**Response:**
```json
{
  "ok": true,
  "service": "shopify-sync"
}
```

### 2. Process Only2u Order

```bash
POST http://localhost:4001/orders/only2u
Content-Type: application/json

{
  "orderId": "ord_123",
  "lineItems": [
    { "sku": "SKU-RED-42", "quantity": 2 },
    { "sku": "SKU-BLUE-38", "quantity": 1 }
  ]
}
```

**Behavior:**
1. Validates stock in Supabase
2. Decrements Supabase inventory
3. Adjusts Shopify inventory via API

**Response:**
```json
{
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Insufficient stock for SKU-RED-42"
}
```

### 3. Shopify Webhook (Order Created)

```bash
POST http://localhost:4001/webhooks/shopify/orders/create
X-Shopify-Hmac-Sha256: <signature>
Content-Type: application/json

{
  "id": 12345,
  "line_items": [
    {
      "sku": "SKU-RED-42",
      "quantity": 1
    }
  ]
}
```

**Behavior:**
1. Verifies webhook signature
2. Extracts SKUs from line items
3. Decrements Supabase inventory

---

## 🗄️ Database Setup

### Ensure Your Table Has Required Columns

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_variants'
AND column_name IN ('sku', 'quantity', 'shopify_inventory_item_id');
```

### Add Missing Columns (if needed)

```sql
-- Add shopify_inventory_item_id if missing
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS shopify_inventory_item_id TEXT;

-- Add quantity if missing
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_sku 
ON product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_product_variants_shopify_id 
ON product_variants(shopify_inventory_item_id);
```

### Link Shopify Inventory Items

You need to populate `shopify_inventory_item_id` for each variant:

```sql
-- Manual update (replace with your actual IDs)
UPDATE product_variants 
SET shopify_inventory_item_id = '12345678901234' 
WHERE sku = 'YOUR-SKU';
```

Or use a script to bulk sync:

```typescript
// Script to sync inventory item IDs
import { supabase } from './supabaseClient';
import axios from 'axios';

async function syncInventoryIds() {
  // 1. Get all variants from Supabase
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku');
  
  // 2. Get all inventory items from Shopify
  const response = await axios.get(
    `https://${SHOPIFY_STORE}/admin/api/2024-01/inventory_items.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN
      }
    }
  );
  
  // 3. Match by SKU and update
  for (const variant of variants) {
    const shopifyItem = response.data.inventory_items.find(
      item => item.sku === variant.sku
    );
    
    if (shopifyItem) {
      await supabase
        .from('product_variants')
        .update({ shopify_inventory_item_id: shopifyItem.id })
        .eq('id', variant.id);
    }
  }
}
```

---

## 🧪 Testing

### 1. Test Health Endpoint

```bash
curl http://localhost:4001/health
```

Should return: `{"ok":true,"service":"shopify-sync"}`

### 2. Test Only2u Order Sync

```bash
curl -X POST http://localhost:4001/orders/only2u \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test_001",
    "lineItems": [
      { "sku": "TEST-SKU", "quantity": 1 }
    ]
  }'
```

### 3. Test Shopify Webhook

Use Shopify's webhook testing tool:
1. Go to Settings → Notifications → Webhooks
2. Click on your webhook
3. Click "Send test notification"

Check server logs for the webhook processing.

### 4. Monitor Logs

```bash
# In the shopify-sync-server terminal
# You should see logs like:
# {"level":30,"msg":"Synced Only2u order to Shopify","orderId":"ord_123"}
```

---

## 🔧 Troubleshooting

### Server Won't Start

**Check environment variables:**
```bash
cd services/shopify-sync-server
cat .env
```

Ensure all required variables are set.

### Webhook Signature Invalid

**Problem:** Shopify webhook returns 401

**Solution:**
1. Verify `SHOPIFY_WEBHOOK_SHARED_SECRET` matches Shopify settings
2. Check that webhook URL is correct
3. Ensure server is using HTTPS (required by Shopify)

### Inventory Not Syncing

**Check these:**

1. **SKUs match exactly** (case-sensitive)
```sql
SELECT sku FROM product_variants WHERE sku = 'YOUR-SKU';
```

2. **Shopify inventory item IDs are set**
```sql
SELECT sku, shopify_inventory_item_id 
FROM product_variants 
WHERE shopify_inventory_item_id IS NULL;
```

3. **Check server logs** for error messages

4. **Verify Shopify API permissions**

### Connection Errors

**Problem:** "ECONNREFUSED" or timeout errors

**Solutions:**
- Check firewall settings
- Verify server is running on correct port
- For webhooks: ensure ngrok or public URL is accessible
- Check Shopify access token hasn't expired

---

## 🚀 Deployment

### Option 1: Deploy to Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repo
4. Set root directory: `services/shopify-sync-server`
5. Add environment variables
6. Deploy!

Railway will give you a public URL.

### Option 2: Deploy to Render

1. Create account at [render.com](https://render.com)
2. New Web Service
3. Connect repo
4. Set:
   - Root Directory: `services/shopify-sync-server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables
6. Deploy!

### Option 3: Docker (Any Platform)

Create `Dockerfile` in `services/shopify-sync-server/`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t shopify-sync .
docker run -p 4001:4001 --env-file .env shopify-sync
```

### Update Shopify Webhook URL

After deployment, update the webhook URL in Shopify Admin to your production URL:
```
https://your-production-domain.com/webhooks/shopify/orders/create
```

---

## 📊 Monitoring

### Log Levels

Set in `.env`:
```env
LOG_LEVEL=debug  # For development
LOG_LEVEL=info   # For production
LOG_LEVEL=error  # Minimal logging
```

### Health Checks

Set up monitoring to ping `/health` every minute:
```bash
*/1 * * * * curl https://your-server.com/health
```

### Webhook Monitoring

In Shopify Admin:
1. Go to Settings → Notifications → Webhooks
2. Click on your webhook
3. View "Recent deliveries" to see success/failure rates

---

## 🔐 Security Best Practices

1. **Use HTTPS** - Required for Shopify webhooks
2. **Rotate tokens** - Periodically update access tokens
3. **Monitor logs** - Watch for suspicious activity
4. **Rate limiting** - Add rate limiting middleware
5. **Secrets management** - Use environment variables, never commit `.env`
6. **Webhook verification** - Already implemented (don't disable!)

---

## 📈 Next Steps

- [ ] Set up monitoring/alerting
- [ ] Add retry logic for failed syncs
- [ ] Implement bulk inventory reconciliation
- [ ] Add sync logs table for auditing
- [ ] Set up automated backups
- [ ] Add Slack/email notifications for errors
- [ ] Create admin dashboard for sync status

---

## 🆘 Need Help?

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 4001 in use | Change PORT in `.env` |
| Webhook 401 | Check shared secret |
| No inventory updates | Verify SKUs and inventory item IDs |
| Connection timeout | Check firewall/network settings |

### Check Server Status

```bash
# View logs
cd services/shopify-sync-server
npm run dev

# Test health endpoint
curl http://localhost:4001/health

# Check if port is listening
lsof -i :4001
```

---

## ✅ Quick Reference

### Start Server
```bash
cd services/shopify-sync-server
npm run dev
```

### Health Check
```bash
curl http://localhost:4001/health
```

### Process Order
```bash
curl -X POST http://localhost:4001/orders/only2u \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","lineItems":[{"sku":"TEST","quantity":1}]}'
```

### View Logs
Server logs appear in the terminal where you ran `npm run dev`

---

**Your Shopify sync server is ready to keep inventories in perfect sync!** 🎉

