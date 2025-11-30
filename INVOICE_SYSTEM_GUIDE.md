# 📄 Universal Invoice Data Model (UIDM) - Complete Guide

## 📋 Overview

A comprehensive invoice system based on the Universal Invoice Data Model (UIDM) that supports all invoice types for GST filing compliance.

---

## ✨ Features

- ✅ **Multiple Invoice Types** - B2B, B2C, Vendor, Influencer, and hybrid models
- ✅ **GST Compliance** - Automatic CGST/SGST/IGST calculation
- ✅ **Tax Validation** - Ensures correct tax fields based on supply type
- ✅ **GST Filing Reports** - Export invoices and HSN summaries
- ✅ **Universal Schema** - Single data model for all invoice types
- ✅ **Auto Calculations** - Automatic tax and total calculations
- ✅ **Number to Words** - Amount in words for invoices

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration

```sql
-- In Supabase SQL Editor, run:
migrations/017_create_invoice_system.sql
```

**This creates:**
- ✅ `invoices` table - Main invoice records
- ✅ `invoice_items` table - Line items with tax details
- ✅ Auto-calculation functions
- ✅ Tax validation triggers
- ✅ GST reporting views

### Step 2: Access Admin Panel

Navigate to: `/admin/InvoiceManagement`

The sidebar now has "Invoices & GST" menu item.

### Step 3: Create Your First Invoice

1. Click "Create Invoice"
2. Fill in invoice details
3. Add items
4. System calculates taxes automatically
5. Issue invoice

---

## 📊 Database Schema

### Tables Created

#### 1. `invoices` Table
Main invoice record with all metadata:

```sql
- id (UUID)
- invoice_no (VARCHAR) - Unique invoice number
- invoice_date (DATE)
- invoice_type (ENUM) - B2B, B2C, Vendor, Influencer, etc.
- supply_type (ENUM) - InterState or IntraState
- transaction_type (ENUM) - Sale, Purchase, Service
- place_of_supply (VARCHAR)
- seller (JSONB) - Seller party details
- buyer (JSONB) - Buyer party details
- consignee (JSONB) - Optional consignee
- summary (JSONB) - Tax summary
- transport (JSONB) - Transport details
- bank (JSONB) - Bank details
- signature (JSONB) - Signature details
- optional (JSONB) - Terms, declarations, etc.
- status (ENUM) - draft, issued, cancelled, archived
- invoice_data (JSONB) - Complete JSON document
```

#### 2. `invoice_items` Table
Line items with detailed tax breakdown:

```sql
- id (UUID)
- invoice_id (UUID) - References invoices
- description (TEXT)
- hsn_code (VARCHAR)
- quantity (NUMERIC)
- unit (VARCHAR)
- rate (NUMERIC)
- discount (NUMERIC)
- taxable_value (NUMERIC)
- cgst_rate, cgst_amount (NUMERIC)
- sgst_rate, sgst_amount (NUMERIC)
- igst_rate, igst_amount (NUMERIC)
- total (NUMERIC)
```

### Views Created

#### `invoice_gst_summary`
Pre-aggregated data for GST filing:
- Invoice details
- Seller/Buyer GSTINs
- Tax totals
- Item counts

#### `invoice_hsn_summary`
HSN-wise summary for GST filing:
- HSN code grouping
- Quantity totals
- Taxable value totals
- Tax amounts by HSN

---

## 🎯 Invoice Types Supported

| Type | Description | GSTIN Required |
|------|-------------|----------------|
| **B2B** | Business to Business | Yes (Both) |
| **B2C** | Business to Consumer | Seller only |
| **Vendor** | Vendor/Purchase invoices | Yes (Both) |
| **Influencer** | Influencer commission invoices | Yes (Both) |
| **B2B-B2C** | Mixed B2B and B2C | Yes (Seller) |
| **B2C-C** | B2C with consignee | Seller only |
| **B2B-C** | B2B with consignee | Yes (Both) |

---

## 💰 Tax Calculation Logic

### IntraState Supply (Same State)

**Tax Structure:**
- CGST (Central GST) - Half of tax rate
- SGST (State GST) - Half of tax rate
- IGST = 0

**Example:**
```
Tax Rate: 5%
CGST Rate: 2.5%
SGST Rate: 2.5%
IGST Rate: 0%
```

### InterState Supply (Different States)

**Tax Structure:**
- IGST (Integrated GST) - Full tax rate
- CGST = 0
- SGST = 0

**Example:**
```
Tax Rate: 5%
CGST Rate: 0%
SGST Rate: 0%
IGST Rate: 5%
```

### Automatic Determination

The system automatically determines supply type:
```typescript
supplyType = sellerStateCode === buyerStateCode 
  ? 'IntraState' 
  : 'InterState';
```

---

## 📝 Invoice Data Structure

### Complete JSON Schema

```json
{
  "invoiceNo": "INV-B2B-20251129-00001",
  "invoiceDate": "2025-11-29",
  "invoiceType": "B2B",
  "supplyType": "IntraState",
  "transactionType": "Sale",
  "placeOfSupply": "Telangana",
  "placeOfDelivery": "Telangana",
  
  "payment": {
    "mode": "NEFT",
    "transactionId": "P0123456789",
    "dateTime": "2025-11-29T14:30:00Z"
  },
  
  "seller": {
    "name": "Only2u Fashions Pvt Ltd",
    "address": "Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003",
    "state": "Telangana",
    "stateCode": "36",
    "gstin": "36AAECO9300L1Z9",
    "pan": "AAECO9300L",
    "phone": "9988776655",
    "email": "sales@only2u.com"
  },
  
  "buyer": {
    "name": "Customer Name",
    "address": "Hyderabad, Telangana",
    "state": "Telangana",
    "stateCode": "36",
    "gstin": "36XXXXX0000X1Z9",
    "pan": "XXXXX0000X"
  },
  
  "items": [
    {
      "description": "Product Name, Size, Details",
      "hsnCode": "123456",
      "quantity": 2,
      "unit": "Pcs",
      "rate": 500.00,
      "discount": 0.00,
      "taxableValue": 1000.00,
      "cgstRate": 2.5,
      "cgstAmount": 25.00,
      "sgstRate": 2.5,
      "sgstAmount": 25.00,
      "igstRate": 0.00,
      "igstAmount": 0.00,
      "total": 1050.00
    }
  ],
  
  "summary": {
    "totalTaxableValue": 2000.00,
    "totalCGST": 50.00,
    "totalSGST": 50.00,
    "totalIGST": 0.00,
    "freightCharges": 0.00,
    "packingCharges": 0.00,
    "shippingCharges": 0.00,
    "otherCharges": 0.00,
    "roundOff": 0.00,
    "grandTotal": 2100.00,
    "amountInWords": "Two thousands one hundred only"
  }
}
```

---

## 🔧 Admin Panel Features

### Invoice Management Page

**Features:**
- ✅ View all invoices
- ✅ Search by invoice number, seller, buyer
- ✅ Filter by type, status, date range
- ✅ Export for GST filing
- ✅ Export HSN summary
- ✅ Create new invoices
- ✅ View/Edit invoices

**Summary Cards:**
- Total Invoices
- Issued Invoices
- Total Revenue
- Total Tax Collected

### Export Functions

#### 1. Export for GST Filing
- Exports all issued invoices
- Includes all GST fields
- Ready for GST portal upload
- Excel format with summary

#### 2. Export HSN Summary
- Groups by HSN code
- Shows quantity and value totals
- Tax breakdown by HSN
- Perfect for GST filing

---

## 📊 GST Filing Reports

### Invoice Export Format

**Columns:**
- Invoice No
- Invoice Date
- Invoice Type
- Supply Type
- Seller GSTIN
- Buyer GSTIN
- Buyer State Code
- Total Taxable Value
- CGST Amount
- SGST Amount
- IGST Amount
- Grand Total

### HSN Summary Format

**Columns:**
- HSN Code
- Supply Type
- Total Quantity
- Total Taxable Value
- Total CGST
- Total SGST
- Total IGST
- Average Tax Rates
- Invoice Count

---

## 🎯 Usage Examples

### Create B2B Invoice

```typescript
import { calculateTaxes, calculateInvoiceSummary } from '@/lib/invoiceUtils';

// For IntraState supply
const taxes = calculateTaxes(1000, 5, 'IntraState');
// Returns: { cgstRate: 2.5, cgstAmount: 25, sgstRate: 2.5, sgstAmount: 25, igstRate: 0, igstAmount: 0 }

// For InterState supply
const taxes = calculateTaxes(1000, 5, 'InterState');
// Returns: { cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 5, igstAmount: 50 }
```

### Calculate Invoice Summary

```typescript
const items = [
  {
    taxableValue: 1000,
    cgstAmount: 25,
    sgstAmount: 25,
    igstAmount: 0,
    // ... other fields
  }
];

const summary = calculateInvoiceSummary(items, 0, 0, 0, 0);
// Returns complete summary with grandTotal and amountInWords
```

### Validate Invoice Data

```typescript
import { validateInvoiceData } from '@/lib/invoiceUtils';

const validation = validateInvoiceData(invoiceData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

---

## 🔐 Database Functions

### Generate Invoice Number

```sql
SELECT generate_invoice_number('B2B', 'Sale');
-- Returns: INV-B2B-20251129-00001
```

### Calculate Invoice Summary

```sql
SELECT calculate_invoice_summary('invoice-uuid');
-- Returns JSONB with calculated summary
```

---

## 📈 Reporting Views

### Invoice GST Summary

```sql
SELECT * FROM invoice_gst_summary
WHERE invoice_date >= '2025-11-01'
  AND invoice_date <= '2025-11-30'
  AND status = 'issued';
```

**Use for:**
- GSTR-1 filing
- Sales reporting
- Tax reconciliation

### HSN Summary

```sql
SELECT * FROM invoice_hsn_summary
ORDER BY hsn_code;
```

**Use for:**
- HSN-wise reporting
- GST filing by HSN
- Product category analysis

---

## 🎨 Invoice Status Flow

```
Draft → Issued → (Cancelled/Archived)
```

**Statuses:**
- **Draft** - Being created, not finalized
- **Issued** - Finalized and sent to customer
- **Cancelled** - Invoice cancelled (credit note needed)
- **Archived** - Historical record

---

## 💡 Best Practices

### Invoice Numbering

- Use consistent format
- Include date prefix
- Sequential numbering
- Unique system-wide

### GST Compliance

1. **Always validate supply type** before calculating taxes
2. **Check GSTIN** for B2B invoices
3. **Verify HSN codes** are correct
4. **Ensure tax rates** match product categories
5. **Keep complete records** for audit

### Data Entry

1. **Double-check party details** (GSTIN, state codes)
2. **Verify HSN codes** match products
3. **Review tax calculations** before issuing
4. **Save drafts** before finalizing
5. **Export regularly** for backup

---

## 🔗 Integration Points

### From Orders

```typescript
// Create invoice from order
const invoice = await createInvoiceFromOrder(orderId, {
  invoiceType: 'B2C',
  transactionType: 'Sale'
});
```

### To GST Portal

```typescript
// Export for GST filing
const gstData = await exportInvoicesForGST(invoices);
// Upload to GST portal
```

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `migrations/017_create_invoice_system.sql` | Database schema |
| `lib/invoiceUtils.ts` | Calculation utilities |
| `app/admin/InvoiceManagement/page.tsx` | Management interface |
| `app/admin/InvoiceManagement/invoiceExportUtils.ts` | Export functions |
| `INVOICE_SYSTEM_GUIDE.md` | This guide |

---

## ✅ Checklist

After running migration:

- [ ] Tables created (`invoices`, `invoice_items`)
- [ ] Views created (`invoice_gst_summary`, `invoice_hsn_summary`)
- [ ] Functions created (generate_invoice_number, calculate_invoice_summary)
- [ ] Triggers created (tax validation, timestamp updates)
- [ ] Admin panel accessible at `/admin/InvoiceManagement`
- [ ] Sidebar shows "Invoices & GST"
- [ ] Can view invoices
- [ ] Can export for GST filing
- [ ] Can export HSN summary

---

## 🎉 You're Ready!

Your invoice system is complete and GST-compliant!

**Next Steps:**
1. Run the migration
2. Access invoice management
3. Create your first invoice
4. Export for GST filing

**Start generating GST-compliant invoices!** 📄✨

---

## 📞 Quick Reference

### Tax Calculation

**IntraState:**
- Tax Rate 5% → CGST 2.5% + SGST 2.5%

**InterState:**
- Tax Rate 5% → IGST 5%

### Export Formats

**GST Filing:**
- Excel format
- All required fields
- Ready for upload

**HSN Summary:**
- Grouped by HSN
- Tax totals
- Quantity totals

---

**Your invoice system is ready for GST filing!** 🚀

