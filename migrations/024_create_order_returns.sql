-- =====================================================
-- ORDER RETURNS TABLE FOR SALES RETURN INVOICES
-- Creates table to track returned orders and generate return invoices
-- =====================================================

-- Create order_returns table
CREATE TABLE IF NOT EXISTS order_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_reason TEXT,
  return_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
  refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  refund_method VARCHAR(50), -- original_payment, bank_transfer, store_credit
  refund_status VARCHAR(50) DEFAULT 'pending', -- pending, processed, completed
  return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_return_items table
CREATE TABLE IF NOT EXISTS order_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES order_returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  size VARCHAR(50),
  color VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20),
  -- Tax information (from original order)
  cgst_rate DECIMAL(5, 2) DEFAULT 0,
  sgst_rate DECIMAL(5, 2) DEFAULT 0,
  igst_rate DECIMAL(5, 2) DEFAULT 0,
  cgst_amount DECIMAL(10, 2) DEFAULT 0,
  sgst_amount DECIMAL(10, 2) DEFAULT 0,
  igst_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_return_number ON order_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_order_returns_return_status ON order_returns(return_status);
CREATE INDEX IF NOT EXISTS idx_order_returns_created_at ON order_returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_return_items_return_id ON order_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_order_return_items_order_item_id ON order_return_items(order_item_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_returns_updated_at
  BEFORE UPDATE ON order_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_order_returns_updated_at();

-- Function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
    date_str TEXT;
    counter INTEGER;
    return_num TEXT;
BEGIN
    date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get count of returns for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM '(\d+)$') AS INTEGER)), 0) + 1
    INTO counter
    FROM order_returns
    WHERE return_number LIKE 'RET-' || date_str || '-%';
    
    return_num := 'RET-' || date_str || '-' || LPAD(counter::TEXT, 5, '0');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM order_returns WHERE return_number = return_num) LOOP
        counter := counter + 1;
        return_num := 'RET-' || date_str || '-' || LPAD(counter::TEXT, 5, '0');
    END LOOP;
    
    RETURN return_num;
END;
$$ LANGUAGE plpgsql;

