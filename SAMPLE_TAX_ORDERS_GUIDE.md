# Sample Tax Orders Guide

This guide explains how to generate sample orders for testing different tax scenarios in the invoice PDF generation.

## Tax Scenarios

The system generates 4 sample orders covering all tax scenarios:

### 1. IGST - Below ₹2500 (InterState) ✅
- **Scenario**: Interstate order with items priced below ₹2500
- **Expected Tax**: 5% IGST per item
- **Shipping Address**: Bangalore, Karnataka (State Code: 29)
- **Seller State**: Telangana (State Code: 36)
- **Items**: 
  - Cotton T-Shirt: ₹999 x 2 = ₹1,998 (5% IGST = ₹99.90)
  - Denim Shorts: ₹1,499 x 1 = ₹1,499 (5% IGST = ₹74.95)
- **Total Tax**: ₹174.85 IGST
- **Order Number**: `SAMPLE-IGST-LOW-YYYYMMDD-00001`

### 2. CGST + SGST - Below ₹2500 (IntraState) ✅
- **Scenario**: Intrastate order with items priced below ₹2500
- **Expected Tax**: 2.5% CGST + 2.5% SGST per item
- **Shipping Address**: Nellore, Andhra Pradesh (State Code: 37)
- **Seller State**: Andhra Pradesh (State Code: 37)
- **Items**:
  - Silk Saree: ₹1,999 x 1 = ₹1,999 (2.5% CGST + 2.5% SGST = ₹99.95)
  - Kurti Set: ₹1,299 x 1 = ₹1,299 (2.5% CGST + 2.5% SGST = ₹64.95)
- **Total Tax**: ₹164.90 (₹82.45 CGST + ₹82.45 SGST)
- **Order Number**: `SAMPLE-CGST-SGST-LOW-YYYYMMDD-00002`

### 3. IGST - Above ₹2500 (InterState) ✅
- **Scenario**: Interstate order with items priced above ₹2500
- **Expected Tax**: 18% IGST per item
- **Shipping Address**: Mumbai, Maharashtra (State Code: 27)
- **Seller State**: Telangana (State Code: 36)
- **Items**:
  - Designer Lehenga: ₹3,500 x 1 = ₹3,500 (18% IGST = ₹630.00)
  - Bridal Saree: ₹4,500 x 1 = ₹4,500 (18% IGST = ₹810.00)
- **Total Tax**: ₹1,440.00 IGST
- **Order Number**: `SAMPLE-IGST-HIGH-YYYYMMDD-00003`

### 4. CGST + SGST - Above ₹2500 (IntraState) ✅
- **Scenario**: Intrastate order with items priced above ₹2500
- **Expected Tax**: 9% CGST + 9% SGST per item
- **Shipping Address**: Nellore, Andhra Pradesh (State Code: 37)
- **Seller State**: Andhra Pradesh (State Code: 37)
- **Items**:
  - Premium Suit Set: ₹3,200 x 1 = ₹3,200 (9% CGST + 9% SGST = ₹576.00)
  - Embroidered Gown: ₹2,800 x 1 = ₹2,800 (9% CGST + 9% SGST = ₹504.00)
- **Total Tax**: ₹1,080.00 (₹540.00 CGST + ₹540.00 SGST)
- **Order Number**: `SAMPLE-CGST-SGST-HIGH-YYYYMMDD-00004`

## How to Generate Sample Orders

### Method 1: Using SQL Script (Recommended - Fastest)

1. **Open Supabase SQL Editor**
2. **Get a User ID** (if you don't have one):
   ```sql
   SELECT id, name, email FROM users LIMIT 1;
   ```
3. **Run the migration script**:
   ```sql
   -- Open and run: migrations/020_create_sample_tax_orders.sql
   ```
   The script will automatically:
   - Use the first available user
   - Create all 4 sample orders
   - Create order items for each order
   - Generate proper order numbers

4. **Verify orders were created**:
   ```sql
   SELECT order_number, total_amount, shipping_address, status 
   FROM orders 
   WHERE order_number LIKE 'SAMPLE-%' 
   ORDER BY created_at DESC;
   ```

### Method 2: Using API Endpoint

1. **Get a User ID**: First, you need a valid user ID from your database
   ```sql
   SELECT id FROM users LIMIT 1;
   ```

2. **Call the API endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/sample-orders/generate \
     -H "Content-Type: application/json" \
     -d '{"user_id": "YOUR_USER_ID_HERE"}'
   ```

3. **Or use browser console**:
   ```javascript
   fetch('/api/sample-orders/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ user_id: 'YOUR_USER_ID' })
   })
   .then(r => r.json())
   .then(console.log);
   ```

4. **Response**: The API will return a list of created orders with their order numbers

## Viewing Generated PDFs

After generating the sample orders:

1. **Go to Order Management** page in the admin panel
2. **Search for orders** with order numbers starting with `SAMPLE-`
3. **Click "Generate PDF"** or **"Download Invoice"** for each order
4. **Verify the tax breakdown** matches the expected scenario:

### Expected PDF Results:

**Order 1 (IGST Low - SAMPLE-IGST-LOW-*):**
- ✅ Should show **IGST only** (no CGST/SGST)
- ✅ Each item should show **5% IGST**
- ✅ Tax breakdown should show: `IGST @ 5%: ₹174.85`

**Order 2 (CGST+SGST Low - SAMPLE-CGST-SGST-LOW-*):**
- ✅ Should show **CGST + SGST only** (no IGST)
- ✅ Each item should show **2.5% CGST + 2.5% SGST**
- ✅ Tax breakdown should show:
  - `CGST @ 2.5%: ₹82.45`
  - `SGST @ 2.5%: ₹82.45`

**Order 3 (IGST High - SAMPLE-IGST-HIGH-*):**
- ✅ Should show **IGST only** (no CGST/SGST)
- ✅ Each item should show **18% IGST**
- ✅ Tax breakdown should show: `IGST @ 18%: ₹1,440.00`

**Order 4 (CGST+SGST High - SAMPLE-CGST-SGST-HIGH-*):**
- ✅ Should show **CGST + SGST only** (no IGST)
- ✅ Each item should show **9% CGST + 9% SGST**
- ✅ Tax breakdown should show:
  - `CGST @ 9%: ₹540.00`
  - `SGST @ 9%: ₹540.00`

## Tax Calculation Rules

### Price Threshold: ₹2500

**For items ≤ ₹2500:**
- **InterState**: 5% IGST
- **IntraState**: 2.5% CGST + 2.5% SGST

**For items > ₹2500:**
- **InterState**: 18% IGST
- **IntraState**: 9% CGST + 9% SGST

### State Determination

- **Seller State**: Andhra Pradesh (State Code: 37) - from GSTIN `37ABFCS0076F1ZE`
- **Seller Name**: Shubhamastu Shopping Mall Private Limited
- **Seller Address**: 17/397, VRC centre, Nellore, Andhra Pradesh
- **Buyer State**: Determined from shipping/billing address state code
- **InterState**: Seller state ≠ Buyer state
- **IntraState**: Seller state = Buyer state

## Sample Order Details

Each sample order includes:
- Unique order number (format: `SAMPLE-YYYYMMDD-XXXXXX`)
- Complete shipping and billing addresses with state codes
- Multiple items with different prices
- HSN codes for GST compliance
- Product details (name, SKU, size, color)

## Troubleshooting

### Orders not appearing?
- Check if the user_id exists in the database
- Verify the orders table has the correct structure
- Check browser console for errors

### PDF not generating?
- Ensure order_items are properly linked to the order
- Verify the order has shipping_address with state code
- Check that the PDF generation function is working

### Tax calculation incorrect?
- Verify state codes in addresses match expected values
- Check if unit_price values are correct
- Ensure tax calculation logic is using the right thresholds

## Notes

- Sample orders are marked with `SAMPLE-` prefix for easy identification
- Orders are created with status `completed` and payment_status `paid`
- You can delete sample orders after testing if needed
- The dummy product ID (`00000000-0000-0000-0000-000000000000`) is used for all items

