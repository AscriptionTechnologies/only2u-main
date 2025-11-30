-- =====================================================
-- SAMPLE INVOICE DATA
-- Test data for Invoice and GST system
-- =====================================================

-- Note: Run migration 017 first before running this

-- =====================================================
-- SAMPLE 1: B2B INVOICE - INTRASTATE
-- =====================================================

DO $$
DECLARE
  invoice_id_1 UUID;
BEGIN
  -- Insert invoice
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-B2B-20251129-00001',
    '2025-11-29',
    'B2B',
    'IntraState',
    'Sale',
    'Telangana',
    'Telangana',
    'NEFT',
    'NEFT123456789',
    '2025-11-29T14:30:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'sales@only2u.com'
    ),
    jsonb_build_object(
      'name', 'ABC Retail Stores',
      'address', '123 Main Street, Hyderabad, Telangana, Pincode: 500001',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36ABCDE1234F1Z5',
      'pan', 'ABCDE1234F',
      'phone', '9876543210',
      'email', 'purchases@abcretail.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 5000.00,
      'totalCGST', 125.00,
      'totalSGST', 125.00,
      'totalIGST', 0.00,
      'freightCharges', 0.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 5250.00,
      'amountInWords', 'Five thousands two hundred fifty only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-B2B-20251129-00001',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'B2B',
      'supplyType', 'IntraState',
      'transactionType', 'Sale'
    )
  ) RETURNING id INTO invoice_id_1;

  -- Insert items
  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_1,
    'Cotton T-Shirt - Size M, Color: Blue',
    '61091000',
    10,
    'Pcs',
    300.00,
    0.00,
    3000.00,
    2.5,
    75.00,
    2.5,
    75.00,
    0.00,
    0.00,
    3150.00,
    1
  ),
  (
    invoice_id_1,
    'Denim Jeans - Size 32, Color: Black',
    '62034200',
    5,
    'Pcs',
    400.00,
    0.00,
    2000.00,
    2.5,
    50.00,
    2.5,
    50.00,
    0.00,
    0.00,
    2100.00,
    2
  );
END $$;

-- =====================================================
-- SAMPLE 2: B2C INVOICE - INTRASTATE
-- =====================================================

DO $$
DECLARE
  invoice_id_2 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-B2C-20251129-00001',
    '2025-11-29',
    'B2C',
    'IntraState',
    'Sale',
    'Telangana',
    'Telangana',
    'UPI',
    'UPI987654321',
    '2025-11-29T10:15:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'sales@only2u.com'
    ),
    jsonb_build_object(
      'name', 'Rahul Sharma',
      'address', '456 Park Avenue, Hyderabad, Telangana, Pincode: 500032',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', NULL,
      'pan', NULL,
      'phone', '9123456789',
      'email', 'rahul.sharma@email.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 1500.00,
      'totalCGST', 37.50,
      'totalSGST', 37.50,
      'totalIGST', 0.00,
      'freightCharges', 50.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 1625.00,
      'amountInWords', 'One thousand six hundred twenty five only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-B2C-20251129-00001',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'B2C',
      'supplyType', 'IntraState',
      'transactionType', 'Sale'
    )
  ) RETURNING id INTO invoice_id_2;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_2,
    'Casual Shirt - Size L, Color: White',
    '62052000',
    2,
    'Pcs',
    750.00,
    0.00,
    1500.00,
    2.5,
    37.50,
    2.5,
    37.50,
    0.00,
    0.00,
    1575.00,
    1
  );
END $$;

-- =====================================================
-- SAMPLE 3: B2B INVOICE - INTERSTATE
-- =====================================================

DO $$
DECLARE
  invoice_id_3 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-B2B-20251129-00002',
    '2025-11-29',
    'B2B',
    'InterState',
    'Sale',
    'Maharashtra',
    'Mumbai, Maharashtra',
    'Bank Transfer',
    'BT9876543210',
    '2025-11-29T16:45:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'sales@only2u.com'
    ),
    jsonb_build_object(
      'name', 'Mumbai Fashion Hub',
      'address', '789 Business Park, Andheri, Mumbai, Maharashtra, Pincode: 400053',
      'state', 'Maharashtra',
      'stateCode', '27',
      'gstin', '27XYZAB5678G2H6',
      'pan', 'XYZAB5678G',
      'phone', '9876543210',
      'email', 'orders@mumbaifashion.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 8000.00,
      'totalCGST', 0.00,
      'totalSGST', 0.00,
      'totalIGST', 400.00,
      'freightCharges', 200.00,
      'packingCharges', 50.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 8650.00,
      'amountInWords', 'Eight thousands six hundred fifty only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-B2B-20251129-00002',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'B2B',
      'supplyType', 'InterState',
      'transactionType', 'Sale'
    )
  ) RETURNING id INTO invoice_id_3;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_3,
    'Designer Kurta Set - Size M, Color: Red',
    '62044200',
    8,
    'Pcs',
    1000.00,
    0.00,
    8000.00,
    0.00,
    0.00,
    0.00,
    0.00,
    5.00,
    400.00,
    8400.00,
    1
  );
END $$;

-- =====================================================
-- SAMPLE 4: VENDOR INVOICE - PURCHASE
-- =====================================================

DO $$
DECLARE
  invoice_id_4 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-VEN-20251129-00001',
    '2025-11-29',
    'Vendor',
    'IntraState',
    'Purchase',
    'Telangana',
    'Telangana',
    'NEFT',
    'VEN123456789',
    '2025-11-29T11:00:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Textile Suppliers India',
      'address', '321 Industrial Area, Hyderabad, Telangana, Pincode: 500018',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36VENDOR1234V1Z8',
      'pan', 'VENDOR1234V',
      'phone', '9123456789',
      'email', 'sales@textilesuppliers.com'
    ),
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'purchases@only2u.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 12000.00,
      'totalCGST', 300.00,
      'totalSGST', 300.00,
      'totalIGST', 0.00,
      'freightCharges', 0.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 12600.00,
      'amountInWords', 'Twelve thousands six hundred only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-VEN-20251129-00001',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'Vendor',
      'supplyType', 'IntraState',
      'transactionType', 'Purchase'
    )
  ) RETURNING id INTO invoice_id_4;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_4,
    'Cotton Fabric - Premium Quality, Color: White',
    '52051200',
    100,
    'Mtrs',
    120.00,
    0.00,
    12000.00,
    2.5,
    300.00,
    2.5,
    300.00,
    0.00,
    0.00,
    12600.00,
    1
  );
END $$;

-- =====================================================
-- SAMPLE 5: INFLUENCER INVOICE - COMMISSION
-- =====================================================

DO $$
DECLARE
  invoice_id_5 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-INF-20251129-00001',
    '2025-11-29',
    'Influencer',
    'IntraState',
    'Service',
    'Telangana',
    'Telangana',
    'UPI',
    'INF987654321',
    '2025-11-29T15:20:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'accounts@only2u.com'
    ),
    jsonb_build_object(
      'name', 'Sarah Johnson',
      'address', '789 Fashion Street, Hyderabad, Telangana, Pincode: 500032',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36INFLU1234I1Z9',
      'pan', 'INFLU1234I',
      'phone', '9876543210',
      'email', 'sarah.johnson@email.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 5000.00,
      'totalCGST', 450.00,
      'totalSGST', 450.00,
      'totalIGST', 0.00,
      'freightCharges', 0.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 5900.00,
      'amountInWords', 'Five thousands nine hundred only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-INF-20251129-00001',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'Influencer',
      'supplyType', 'IntraState',
      'transactionType', 'Service'
    )
  ) RETURNING id INTO invoice_id_5;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_5,
    'Influencer Marketing Services - Commission for Product Promotion',
    '998314',
    1,
    'Service',
    5000.00,
    0.00,
    5000.00,
    9.00,
    450.00,
    9.00,
    450.00,
    0.00,
    0.00,
    5900.00,
    1
  );
END $$;

-- =====================================================
-- SAMPLE 6: B2C INVOICE - INTERSTATE
-- =====================================================

DO $$
DECLARE
  invoice_id_6 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-B2C-20251129-00002',
    '2025-11-29',
    'B2C',
    'InterState',
    'Sale',
    'Karnataka',
    'Bangalore, Karnataka',
    'Credit Card',
    'CC123456789012',
    '2025-11-29T09:30:00Z'::timestamptz,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'sales@only2u.com'
    ),
    jsonb_build_object(
      'name', 'Priya Patel',
      'address', '123 MG Road, Bangalore, Karnataka, Pincode: 560001',
      'state', 'Karnataka',
      'stateCode', '29',
      'gstin', NULL,
      'pan', NULL,
      'phone', '9123456789',
      'email', 'priya.patel@email.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 2500.00,
      'totalCGST', 0.00,
      'totalSGST', 0.00,
      'totalIGST', 125.00,
      'freightCharges', 100.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 2725.00,
      'amountInWords', 'Two thousands seven hundred twenty five only'
    ),
    'issued',
    jsonb_build_object(
      'invoiceNo', 'INV-B2C-20251129-00002',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'B2C',
      'supplyType', 'InterState',
      'transactionType', 'Sale'
    )
  ) RETURNING id INTO invoice_id_6;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_6,
    'Designer Saree - Premium Silk, Color: Maroon',
    '50072000',
    1,
    'Pcs',
    2500.00,
    0.00,
    2500.00,
    0.00,
    0.00,
    0.00,
    0.00,
    5.00,
    125.00,
    2625.00,
    1
  );
END $$;

-- =====================================================
-- SAMPLE 7: DRAFT INVOICE
-- =====================================================

DO $$
DECLARE
  invoice_id_7 UUID;
BEGIN
  INSERT INTO invoices (
    invoice_no,
    invoice_date,
    invoice_type,
    supply_type,
    transaction_type,
    place_of_supply,
    place_of_delivery,
    payment_mode,
    payment_transaction_id,
    payment_date_time,
    seller,
    buyer,
    summary,
    status,
    invoice_data
  ) VALUES (
    'INV-B2B-20251129-00003',
    '2025-11-29',
    'B2B',
    'IntraState',
    'Sale',
    'Telangana',
    'Telangana',
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'name', 'Only2u Fashions Pvt Ltd',
      'address', 'Door No: 9-1-87, Secunderabad, Telangana, Pincode: 500003',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36AAECO9300L1Z9',
      'pan', 'AAECO9300L',
      'phone', '9988776655',
      'email', 'sales@only2u.com'
    ),
    jsonb_build_object(
      'name', 'XYZ Trading Company',
      'address', '456 Market Street, Hyderabad, Telangana, Pincode: 500001',
      'state', 'Telangana',
      'stateCode', '36',
      'gstin', '36XYZTR1234X1Z7',
      'pan', 'XYZTR1234X',
      'phone', '9876543210',
      'email', 'orders@xyztrading.com'
    ),
    jsonb_build_object(
      'totalTaxableValue', 3000.00,
      'totalCGST', 75.00,
      'totalSGST', 75.00,
      'totalIGST', 0.00,
      'freightCharges', 0.00,
      'packingCharges', 0.00,
      'shippingCharges', 0.00,
      'otherCharges', 0.00,
      'roundOff', 0.00,
      'grandTotal', 3150.00,
      'amountInWords', 'Three thousands one hundred fifty only'
    ),
    'draft',
    jsonb_build_object(
      'invoiceNo', 'INV-B2B-20251129-00003',
      'invoiceDate', '2025-11-29',
      'invoiceType', 'B2B',
      'supplyType', 'IntraState',
      'transactionType', 'Sale'
    )
  ) RETURNING id INTO invoice_id_7;

  INSERT INTO invoice_items (
    invoice_id,
    description,
    hsn_code,
    quantity,
    unit,
    rate,
    discount,
    taxable_value,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total,
    item_order
  ) VALUES
  (
    invoice_id_7,
    'Formal Shirt - Size XL, Color: Navy Blue',
    '62052000',
    6,
    'Pcs',
    500.00,
    0.00,
    3000.00,
    2.5,
    75.00,
    2.5,
    75.00,
    0.00,
    0.00,
    3150.00,
    1
  );
END $$;

-- =====================================================
-- VERIFY SAMPLE DATA
-- =====================================================

-- Check invoices created
SELECT 
  invoice_no,
  invoice_type,
  supply_type,
  status,
  (summary->>'grandTotal')::NUMERIC as grand_total
FROM invoices
ORDER BY invoice_date DESC, invoice_no;

-- Check invoice items
SELECT 
  i.invoice_no,
  ii.description,
  ii.hsn_code,
  ii.quantity,
  ii.taxable_value,
  ii.cgst_amount,
  ii.sgst_amount,
  ii.igst_amount,
  ii.total
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
ORDER BY i.invoice_date DESC, i.invoice_no, ii.item_order;

-- Check GST summary view
SELECT * FROM invoice_gst_summary
ORDER BY invoice_date DESC;

-- Check HSN summary view
SELECT * FROM invoice_hsn_summary
ORDER BY hsn_code;

SELECT 'Sample invoice data inserted successfully' AS status;

