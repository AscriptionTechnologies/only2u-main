-- =====================================================
-- UNIVERSAL INVOICE DATA MODEL (UIDM)
-- Complete invoice system for GST filing
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- =====================================================
-- 1. INVOICES TABLE
-- Main invoice record with all metadata
-- =====================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Root Invoice Metadata
  invoice_no VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_type VARCHAR(50) NOT NULL CHECK (invoice_type IN ('B2B', 'B2C', 'Vendor', 'Influencer', 'B2B-B2C', 'B2C-C', 'B2B-C')),
  supply_type VARCHAR(50) NOT NULL CHECK (supply_type IN ('InterState', 'IntraState')),
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Sale', 'Purchase', 'Service')),
  place_of_supply VARCHAR(255) NOT NULL,
  place_of_delivery VARCHAR(255),
  
  -- Payment Information
  payment_mode VARCHAR(100),
  payment_transaction_id VARCHAR(255),
  payment_date_time TIMESTAMPTZ,
  
  -- Seller Information (JSONB for flexibility)
  seller JSONB NOT NULL,
  
  -- Buyer Information (JSONB)
  buyer JSONB NOT NULL,
  
  -- Consignee Information (JSONB, optional)
  consignee JSONB,
  
  -- Tax Summary
  summary JSONB NOT NULL,
  
  -- Transport Details (JSONB, optional)
  transport JSONB,
  
  -- Bank Details (JSONB, optional)
  bank JSONB,
  
  -- Signature (JSONB, optional)
  signature JSONB,
  
  -- Optional Fields (JSONB)
  optional JSONB,
  
  -- Status and Metadata
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled', 'archived')),
  order_id UUID, -- Reference to orders table if applicable
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full JSON document for complete record
  invoice_data JSONB NOT NULL
);

-- =====================================================
-- 2. INVOICE ITEMS TABLE
-- Individual line items for detailed reporting
-- =====================================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item Details
  description TEXT NOT NULL,
  hsn_code VARCHAR(50) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) DEFAULT 0,
  taxable_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Tax Fields (mutually exclusive based on supply_type)
  cgst_rate NUMERIC(5, 2) DEFAULT 0,
  cgst_amount NUMERIC(12, 2) DEFAULT 0,
  sgst_rate NUMERIC(5, 2) DEFAULT 0,
  sgst_amount NUMERIC(12, 2) DEFAULT 0,
  igst_rate NUMERIC(5, 2) DEFAULT 0,
  igst_amount NUMERIC(12, 2) DEFAULT 0,
  
  -- Total
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Item Order
  item_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Invoice Indexes
CREATE INDEX idx_invoices_invoice_no ON invoices(invoice_no);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_supply_type ON invoices(supply_type);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- GIN indexes for JSONB fields (for efficient JSON queries)
CREATE INDEX idx_invoices_seller_gin ON invoices USING GIN (seller);
CREATE INDEX idx_invoices_buyer_gin ON invoices USING GIN (buyer);
CREATE INDEX idx_invoices_summary_gin ON invoices USING GIN (summary);

-- Invoice Items Indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_hsn_code ON invoice_items(hsn_code);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

CREATE TRIGGER trigger_update_invoice_items_timestamp
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(
  invoice_type_param VARCHAR,
  transaction_type_param VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR(10);
  today_prefix VARCHAR(20);
  max_number INTEGER;
  new_number VARCHAR(100);
BEGIN
  -- Generate prefix based on type
  prefix := CASE
    WHEN invoice_type_param = 'B2B' THEN 'INV-B2B'
    WHEN invoice_type_param = 'B2C' THEN 'INV-B2C'
    WHEN invoice_type_param = 'Vendor' THEN 'INV-VEN'
    WHEN invoice_type_param = 'Influencer' THEN 'INV-INF'
    ELSE 'INV'
  END;
  
  today_prefix := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  
  -- Find the maximum invoice number for today
  BEGIN
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(
          invoice_no 
          FROM LENGTH(today_prefix) + 1
        ) AS INTEGER
      )
    ), 0)
    INTO max_number
    FROM invoices
    WHERE invoice_no LIKE today_prefix || '%'
      AND LENGTH(invoice_no) > LENGTH(today_prefix)
      AND SUBSTRING(invoice_no FROM LENGTH(today_prefix) + 1) ~ '^[0-9]+$';
  EXCEPTION
    WHEN OTHERS THEN
      max_number := 0;
  END;
  
  -- Generate new number
  new_number := today_prefix || LPAD((max_number + 1)::TEXT, 5, '0');
  
  -- Check if number already exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_no = new_number) LOOP
    max_number := max_number + 1;
    new_number := today_prefix || LPAD(max_number::TEXT, 5, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate tax summary from items
CREATE OR REPLACE FUNCTION calculate_invoice_summary(invoice_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  summary_data JSONB;
  total_taxable NUMERIC;
  total_cgst NUMERIC;
  total_sgst NUMERIC;
  total_igst NUMERIC;
  grand_total NUMERIC;
  supply_type_val VARCHAR;
BEGIN
  -- Get supply type
  SELECT supply_type INTO supply_type_val
  FROM invoices
  WHERE id = invoice_id_param;
  
  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(taxable_value), 0),
    COALESCE(SUM(cgst_amount), 0),
    COALESCE(SUM(sgst_amount), 0),
    COALESCE(SUM(igst_amount), 0),
    COALESCE(SUM(total), 0)
  INTO total_taxable, total_cgst, total_sgst, total_igst, grand_total
  FROM invoice_items
  WHERE invoice_id = invoice_id_param;
  
  -- Build summary JSON
  summary_data := jsonb_build_object(
    'totalTaxableValue', total_taxable,
    'totalCGST', total_cgst,
    'totalSGST', total_sgst,
    'totalIGST', total_igst,
    'freightCharges', 0,
    'packingCharges', 0,
    'shippingCharges', 0,
    'otherCharges', 0,
    'roundOff', 0,
    'grandTotal', grand_total,
    'amountInWords', ''
  );
  
  RETURN summary_data;
END;
$$ LANGUAGE plpgsql;

-- Function to validate GST tax fields based on supply type
CREATE OR REPLACE FUNCTION validate_invoice_taxes()
RETURNS TRIGGER AS $$
DECLARE
  supply_type_val VARCHAR;
BEGIN
  -- Get supply type from invoice
  SELECT supply_type INTO supply_type_val
  FROM invoices
  WHERE id = NEW.invoice_id;
  
  -- Validate tax fields based on supply type
  IF supply_type_val = 'IntraState' THEN
    -- IntraState: CGST and SGST should be present, IGST should be 0
    IF NEW.igst_rate > 0 OR NEW.igst_amount > 0 THEN
      RAISE EXCEPTION 'IGST cannot be set for IntraState supply. Use CGST and SGST instead.';
    END IF;
    IF NEW.cgst_rate = 0 AND NEW.sgst_rate = 0 THEN
      RAISE WARNING 'IntraState supply should have CGST and SGST rates.';
    END IF;
  ELSIF supply_type_val = 'InterState' THEN
    -- InterState: IGST should be present, CGST and SGST should be 0
    IF NEW.cgst_rate > 0 OR NEW.cgst_amount > 0 OR NEW.sgst_rate > 0 OR NEW.sgst_amount > 0 THEN
      RAISE EXCEPTION 'CGST and SGST cannot be set for InterState supply. Use IGST instead.';
    END IF;
    IF NEW.igst_rate = 0 THEN
      RAISE WARNING 'InterState supply should have IGST rate.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate taxes
CREATE TRIGGER trigger_validate_invoice_taxes
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_taxes();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View: Invoice Summary for GST Filing
CREATE OR REPLACE VIEW invoice_gst_summary AS
SELECT 
  i.id,
  i.invoice_no,
  i.invoice_date,
  i.invoice_type,
  i.supply_type,
  i.transaction_type,
  i.place_of_supply,
  i.status,
  (i.seller->>'gstin')::VARCHAR as seller_gstin,
  (i.buyer->>'gstin')::VARCHAR as buyer_gstin,
  (i.buyer->>'name')::VARCHAR as buyer_name,
  (i.buyer->>'stateCode')::VARCHAR as buyer_state_code,
  (i.summary->>'totalTaxableValue')::NUMERIC as total_taxable_value,
  (i.summary->>'totalCGST')::NUMERIC as total_cgst,
  (i.summary->>'totalSGST')::NUMERIC as total_sgst,
  (i.summary->>'totalIGST')::NUMERIC as total_igst,
  (i.summary->>'grandTotal')::NUMERIC as grand_total,
  COUNT(ii.id) as item_count
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.status = 'issued'
GROUP BY i.id, i.invoice_no, i.invoice_date, i.invoice_type, i.supply_type, 
         i.transaction_type, i.place_of_supply, i.status, i.seller, i.buyer, i.summary;

-- View: HSN Summary for GST Filing
CREATE OR REPLACE VIEW invoice_hsn_summary AS
SELECT 
  ii.hsn_code,
  i.supply_type,
  SUM(ii.quantity) as total_quantity,
  SUM(ii.taxable_value) as total_taxable_value,
  SUM(ii.cgst_amount) as total_cgst,
  SUM(ii.sgst_amount) as total_sgst,
  SUM(ii.igst_amount) as total_igst,
  AVG(ii.cgst_rate) as avg_cgst_rate,
  AVG(ii.sgst_rate) as avg_sgst_rate,
  AVG(ii.igst_rate) as avg_igst_rate,
  COUNT(DISTINCT i.id) as invoice_count
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
WHERE i.status = 'issued'
GROUP BY ii.hsn_code, i.supply_type;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoices IS 'Universal Invoice Data Model - stores all invoice types (B2B, B2C, Vendor, Influencer)';
COMMENT ON TABLE invoice_items IS 'Line items for invoices with detailed tax breakdown';
COMMENT ON COLUMN invoices.supply_type IS 'InterState or IntraState - determines CGST/SGST vs IGST calculation';
COMMENT ON COLUMN invoice_items.cgst_rate IS 'Central GST rate - only for IntraState supply';
COMMENT ON COLUMN invoice_items.igst_rate IS 'Integrated GST rate - only for InterState supply';

-- =====================================================
-- END OF SCHEMA
-- =====================================================

SELECT 'Invoice system created successfully' AS status;

