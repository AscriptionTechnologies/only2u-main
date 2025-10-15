-- Migration: Create customer_draft_orders table
-- Date: 2025-10-15
-- Description: Adds customer_draft_orders table for handling orders when stock is unavailable

-- Create customer_draft_orders table
CREATE TABLE IF NOT EXISTS customer_draft_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_address TEXT,
  billing_address TEXT,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- Create customer_draft_order_items table
CREATE TABLE IF NOT EXISTS customer_draft_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_order_id UUID NOT NULL REFERENCES customer_draft_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_variant_id UUID REFERENCES product_variants(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_image TEXT,
  size VARCHAR(50),
  color VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_draft_orders_user_id ON customer_draft_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_draft_orders_status ON customer_draft_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_draft_orders_created_at ON customer_draft_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_draft_order_items_draft_order_id ON customer_draft_order_items(draft_order_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_draft_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_draft_orders_timestamp
BEFORE UPDATE ON customer_draft_orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_draft_orders_updated_at();

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_draft_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
BEGIN
  counter := (SELECT COUNT(*) FROM customer_draft_orders) + 1;
  new_number := 'DRAFT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 5, '0');
  
  -- Check if number already exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM customer_draft_orders WHERE order_number = new_number) LOOP
    counter := counter + 1;
    new_number := 'DRAFT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 5, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Verify the migration
SELECT 'customer_draft_orders table created successfully' AS status;

