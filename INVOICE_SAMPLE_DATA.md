# 📄 Invoice System - Sample Data Guide

## ✅ Sample Data Created!

Sample invoice data has been created for testing and demonstration.

---

## 🚀 How to Load Sample Data

### Step 1: Run Main Migration (If Not Done)

```sql
-- Run this first:
migrations/017_create_invoice_system.sql
```

### Step 2: Load Sample Data

```sql
-- Run this to insert sample invoices:
migrations/018_insert_sample_invoice_data.sql
```

---

## 📊 Sample Invoices Included

### 1. B2B Invoice - IntraState ✅
- **Invoice No:** `INV-B2B-20251129-00001`
- **Type:** B2B Sale
- **Supply:** IntraState (Telangana → Telangana)
- **Items:** 2 items (T-Shirts, Jeans)
- **Total:** ₹5,250
- **Tax:** CGST ₹125 + SGST ₹125
- **Status:** Issued

### 2. B2C Invoice - IntraState ✅
- **Invoice No:** `INV-B2C-20251129-00001`
- **Type:** B2C Sale
- **Supply:** IntraState
- **Items:** 1 item (Casual Shirt)
- **Total:** ₹1,625 (includes freight)
- **Tax:** CGST ₹37.50 + SGST ₹37.50
- **Status:** Issued

### 3. B2B Invoice - InterState ✅
- **Invoice No:** `INV-B2B-20251129-00002`
- **Type:** B2B Sale
- **Supply:** InterState (Telangana → Maharashtra)
- **Items:** 1 item (Designer Kurta Set)
- **Total:** ₹8,650 (includes freight & packing)
- **Tax:** IGST ₹400
- **Status:** Issued

### 4. Vendor Invoice - Purchase ✅
- **Invoice No:** `INV-VEN-20251129-00001`
- **Type:** Vendor Purchase
- **Supply:** IntraState
- **Items:** 1 item (Cotton Fabric)
- **Total:** ₹12,600
- **Tax:** CGST ₹300 + SGST ₹300
- **Status:** Issued

### 5. Influencer Invoice - Commission ✅
- **Invoice No:** `INV-INF-20251129-00001`
- **Type:** Influencer Service
- **Supply:** IntraState
- **Items:** 1 item (Marketing Services)
- **Total:** ₹5,900
- **Tax:** CGST ₹450 + SGST ₹450 (18% GST)
- **Status:** Issued

### 6. B2C Invoice - InterState ✅
- **Invoice No:** `INV-B2C-20251129-00002`
- **Type:** B2C Sale
- **Supply:** InterState (Telangana → Karnataka)
- **Items:** 1 item (Designer Saree)
- **Total:** ₹2,725 (includes freight)
- **Tax:** IGST ₹125
- **Status:** Issued

### 7. Draft Invoice ✅
- **Invoice No:** `INV-B2B-20251129-00003`
- **Type:** B2B Sale
- **Supply:** IntraState
- **Items:** 1 item (Formal Shirt)
- **Total:** ₹3,150
- **Tax:** CGST ₹75 + SGST ₹75
- **Status:** Draft (not issued)

---

## 🎯 What You Can Test

### View Invoices
1. Go to `/admin/InvoiceManagement`
2. See all 7 sample invoices
3. Filter by type, status, date
4. Search by invoice number

### Test Filters
- **Type Filter:** B2B, B2C, Vendor, Influencer
- **Status Filter:** Draft, Issued
- **Date Range:** Filter by invoice date
- **Search:** By invoice number, seller, buyer

### Test Exports
1. **Export for GST Filing:**
   - Click "Export for GST Filing"
   - Excel file with all issued invoices
   - Ready for GST portal upload

2. **Export HSN Summary:**
   - Click "Export HSN Summary"
   - Excel with HSN-wise totals
   - Perfect for GST filing

### Test Tax Calculations
- **IntraState:** See CGST + SGST
- **InterState:** See IGST only
- **Verify:** Tax amounts are correct

---

## 📊 Sample Data Summary

| Invoice Type | Count | Supply Type | Total Amount |
|--------------|-------|-------------|--------------|
| B2B | 2 | IntraState (1), InterState (1) | ₹13,900 |
| B2C | 2 | IntraState (1), InterState (1) | ₹4,350 |
| Vendor | 1 | IntraState | ₹12,600 |
| Influencer | 1 | IntraState | ₹5,900 |
| **Total** | **7** | **Mixed** | **₹36,750** |

### Tax Breakdown

**IntraState Invoices:**
- Total CGST: ₹987.50
- Total SGST: ₹987.50
- Total IGST: ₹0

**InterState Invoices:**
- Total CGST: ₹0
- Total SGST: ₹0
- Total IGST: ₹525

**Grand Total Tax:** ₹2,500

---

## 🔍 Verify Sample Data

### Check Invoices
```sql
SELECT 
  invoice_no,
  invoice_type,
  supply_type,
  status,
  (summary->>'grandTotal')::NUMERIC as grand_total
FROM invoices
ORDER BY invoice_date DESC;
```

### Check Items
```sql
SELECT 
  i.invoice_no,
  ii.description,
  ii.hsn_code,
  ii.quantity,
  ii.taxable_value,
  ii.total
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
ORDER BY i.invoice_no;
```

### Check GST Summary
```sql
SELECT * FROM invoice_gst_summary;
```

### Check HSN Summary
```sql
SELECT * FROM invoice_hsn_summary;
```

---

## 📈 HSN Codes in Sample Data

| HSN Code | Description | Used In |
|----------|-------------|---------|
| `61091000` | Cotton T-Shirt | B2B Invoice 1 |
| `62034200` | Denim Jeans | B2B Invoice 1 |
| `62052000` | Casual/Formal Shirt | B2C Invoice 1, Draft Invoice |
| `62044200` | Designer Kurta Set | B2B Invoice 2 (InterState) |
| `52051200` | Cotton Fabric | Vendor Invoice |
| `998314` | Marketing Services | Influencer Invoice |
| `50072000` | Designer Saree | B2C Invoice 2 (InterState) |

---

## 🎨 Test Scenarios

### Scenario 1: View All Invoices
- Go to Invoice Management
- See all 7 invoices
- Check summary cards update

### Scenario 2: Filter by Type
- Filter: B2B only
- Should show 2 invoices
- Filter: B2C only
- Should show 2 invoices

### Scenario 3: Filter by Status
- Filter: Issued only
- Should show 6 invoices
- Filter: Draft only
- Should show 1 invoice

### Scenario 4: Export for GST
- Click "Export for GST Filing"
- Excel downloads with 6 issued invoices
- Verify all GST fields present

### Scenario 5: Export HSN Summary
- Click "Export HSN Summary"
- Excel downloads with HSN grouping
- Verify totals match invoices

### Scenario 6: Search
- Search: "B2B"
- Shows 2 B2B invoices
- Search: "Sarah"
- Shows Influencer invoice

---

## 💡 Sample Data Details

### Seller Information (All Invoices)
```
Name: Only2u Fashions Pvt Ltd
Address: Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003
State: Telangana
State Code: 36
GSTIN: 36AAECO9300L1Z9
PAN: AAECO9300L
```

### Tax Rates Used
- **5% GST** - Most products (2.5% CGST + 2.5% SGST for IntraState)
- **18% GST** - Services (9% CGST + 9% SGST for IntraState)

### Payment Methods
- NEFT
- UPI
- Credit Card
- Bank Transfer

---

## ✅ Verification Checklist

After loading sample data:

- [ ] 7 invoices visible in admin panel
- [ ] Summary cards show correct totals
- [ ] Can filter by type (B2B, B2C, Vendor, Influencer)
- [ ] Can filter by status (Draft, Issued)
- [ ] Can search by invoice number
- [ ] Export for GST works
- [ ] Export HSN Summary works
- [ ] Tax calculations are correct
- [ ] IntraState shows CGST + SGST
- [ ] InterState shows IGST only

---

## 🧪 Testing GST Reports

### Test Invoice Export
1. Export all issued invoices
2. Verify Excel has all columns
3. Check totals match database
4. Verify GST fields present

### Test HSN Summary
1. Export HSN summary
2. Verify HSN codes grouped correctly
3. Check totals match individual invoices
4. Verify tax breakdown by HSN

---

## 📊 Expected Results

### Summary Cards Should Show:
- **Total Invoices:** 7
- **Issued Invoices:** 6
- **Total Revenue:** ₹36,750
- **Total Tax Collected:** ₹2,500

### GST Export Should Include:
- 6 issued invoices
- All GST fields
- Seller and buyer GSTINs
- Tax breakdowns

### HSN Summary Should Show:
- 7 unique HSN codes
- Quantity totals
- Taxable value totals
- Tax amounts by HSN

---

## 🎉 You're Ready to Test!

**Sample data includes:**
- ✅ Multiple invoice types
- ✅ Both supply types (IntraState & InterState)
- ✅ Various tax scenarios
- ✅ Different statuses
- ✅ Multiple HSN codes
- ✅ Realistic business data

**Start testing your invoice system!** 📄✨

---

## 🔄 Reset Sample Data

To clear sample data and start fresh:

```sql
-- Delete all sample invoices
DELETE FROM invoice_items;
DELETE FROM invoices;

-- Or delete specific invoices
DELETE FROM invoices WHERE invoice_no LIKE 'INV-%20251129%';
```

---

**Your invoice system now has sample data for testing!** 🚀

