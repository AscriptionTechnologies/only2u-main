-- Migration: Reset and Fix Order Number Generation
-- Description: Completely resets and simplifies order number generation functions
--              to ensure they always work reliably

-- Drop existing functions first
DROP FUNCTION IF EXISTS generate_draft_order_number() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Create simplified draft order number generation function
CREATE OR REPLACE FUNCTION generate_draft_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
  today_prefix VARCHAR(20);
  today_date VARCHAR(8);
BEGIN
  -- Get today's date in YYYYMMDD format
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  today_prefix := 'DRAFT-' || today_date || '-';
  
  -- Simple approach: Count existing orders for today and add 1
  -- This is safe because we check for uniqueness below
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO counter
  FROM customer_draft_orders
  WHERE order_number LIKE today_prefix || '%';
  
  -- Generate the order number
  new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  
  -- Ensure uniqueness - if number exists, keep incrementing
  WHILE EXISTS (SELECT 1 FROM customer_draft_orders WHERE order_number = new_number) LOOP
    counter := counter + 1;
    new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
    
    -- Safety check to prevent infinite loop
    IF counter > 99999 THEN
      -- Fallback: use timestamp if we somehow exceed 99999 orders in a day
      new_number := 'DRAFT-' || today_date || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create simplified regular order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
  today_prefix VARCHAR(20);
  today_date VARCHAR(8);
BEGIN
  -- Get today's date in YYYYMMDD format
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  today_prefix := 'ORD-' || today_date || '-';
  
  -- Simple approach: Count existing orders for today and add 1
  -- This is safe because we check for uniqueness below
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO counter
  FROM orders
  WHERE order_number LIKE today_prefix || '%';
  
  -- Generate the order number
  new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  
  -- Ensure uniqueness - if number exists, keep incrementing
  WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = new_number) LOOP
    counter := counter + 1;
    new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
    
    -- Safety check to prevent infinite loop
    IF counter > 99999 THEN
      -- Fallback: use timestamp if we somehow exceed 99999 orders in a day
      new_number := 'ORD-' || today_date || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Test the functions to ensure they work
DO $$
DECLARE
  test_draft_number VARCHAR(50);
  test_order_number VARCHAR(50);
BEGIN
  -- Test draft order number generation
  SELECT generate_draft_order_number() INTO test_draft_number;
  RAISE NOTICE 'Test draft order number: %', test_draft_number;
  
  -- Test regular order number generation
  SELECT generate_order_number() INTO test_order_number;
  RAISE NOTICE 'Test order number: %', test_order_number;
END $$;

-- Verify the functions
SELECT 'Order number generation functions reset and fixed successfully' AS status;

