-- Migration: Fix order number generation to reset properly after deletions
-- Description: Updates the order number generation function to use MAX() instead of COUNT()
--              so that deleted orders don't affect the sequence

-- Fix draft order number generation
CREATE OR REPLACE FUNCTION generate_draft_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
  today_prefix VARCHAR(20);
  max_number INTEGER;
BEGIN
  today_prefix := 'DRAFT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  
  -- Find the maximum order number for today's date
  -- Use a safer approach: extract numeric part and handle errors
  BEGIN
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(
          order_number 
          FROM LENGTH(today_prefix) + 1
        ) AS INTEGER
      )
    ), 0)
    INTO max_number
    FROM customer_draft_orders
    WHERE order_number LIKE today_prefix || '%'
      AND LENGTH(order_number) > LENGTH(today_prefix)
      AND SUBSTRING(order_number FROM LENGTH(today_prefix) + 1) ~ '^[0-9]+$';
  EXCEPTION
    WHEN OTHERS THEN
      max_number := 0;
  END;
  
  -- Start from 1 if no orders exist today, otherwise increment from max
  counter := max_number + 1;
  new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  
  -- Check if number already exists and increment if needed (safety check)
  WHILE EXISTS (SELECT 1 FROM customer_draft_orders WHERE order_number = new_number) LOOP
    counter := counter + 1;
    new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists (in case return type changed)
-- Using CASCADE to handle any overloaded versions
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Create function to generate regular order numbers (for orders table)
CREATE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
  today_prefix VARCHAR(20);
  max_number INTEGER;
BEGIN
  today_prefix := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  
  -- Find the maximum order number for today's date
  -- Use a safer approach: extract numeric part and handle errors
  BEGIN
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(
          order_number 
          FROM LENGTH(today_prefix) + 1
        ) AS INTEGER
      )
    ), 0)
    INTO max_number
    FROM orders
    WHERE order_number LIKE today_prefix || '%'
      AND LENGTH(order_number) > LENGTH(today_prefix)
      AND SUBSTRING(order_number FROM LENGTH(today_prefix) + 1) ~ '^[0-9]+$';
  EXCEPTION
    WHEN OTHERS THEN
      max_number := 0;
  END;
  
  -- Start from 1 if no orders exist today, otherwise increment from max
  counter := max_number + 1;
  new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  
  -- Check if number already exists and increment if needed (safety check)
  WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = new_number) LOOP
    counter := counter + 1;
    new_number := today_prefix || LPAD(counter::TEXT, 5, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Verify the functions
SELECT 'Order number generation functions updated successfully' AS status;

