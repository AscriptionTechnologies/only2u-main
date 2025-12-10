-- =====================================================
-- SAMPLE RETURN ORDERS FOR TESTING
-- Creates sample return orders for testing sales return invoices
-- =====================================================

DO $$
DECLARE
    sample_user_id UUID;
    sample_order_id UUID;
    sample_order_item_id UUID;
    return1_id UUID;
    return2_id UUID;
    return3_id UUID;
    date_str TEXT;
    deleted_count INTEGER;
BEGIN
    -- Delete existing sample returns first (to make script idempotent)
    DELETE FROM order_return_items WHERE return_id IN (
        SELECT id FROM order_returns WHERE return_number LIKE 'SAMPLE-RET-%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM order_returns WHERE return_number LIKE 'SAMPLE-RET-%';
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % existing sample return items', deleted_count;
    END IF;
    
    -- Get a user ID
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please create a user first.';
    END IF;
    
    -- Generate date string for return numbers
    date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- =====================================================
    -- RETURN 1: Full return of IGST order (below ₹2500)
    -- =====================================================
    -- Get a sample order with IGST (below ₹2500)
    SELECT o.id INTO sample_order_id
    FROM orders o
    WHERE o.order_number LIKE 'SAMPLE-IGST-LOW-%'
    LIMIT 1;
    
    IF sample_order_id IS NOT NULL THEN
        -- Create return
        INSERT INTO order_returns (
            order_id,
            return_number,
            return_reason,
            return_status,
            refund_amount,
            refund_method,
            refund_status,
            return_date,
            created_at
        ) VALUES (
            sample_order_id,
            'SAMPLE-RET-' || date_str || '-00001',
            'Product damaged during shipping. Customer requested full refund.',
            'completed',
            3497.00,
            'original_payment',
            'processed',
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days'
        ) RETURNING id INTO return1_id;
        
        -- Get order items and create return items
        FOR sample_order_item_id IN 
            SELECT id FROM order_items WHERE order_id = sample_order_id
        LOOP
            INSERT INTO order_return_items (
                return_id,
                order_item_id,
                product_id,
                product_name,
                product_sku,
                size,
                color,
                quantity,
                unit_price,
                total_price,
                hsn_code,
                cgst_rate,
                sgst_rate,
                igst_rate,
                cgst_amount,
                sgst_amount,
                igst_amount,
                tax_amount,
                net_amount
            )
            SELECT 
                return1_id,
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.product_sku,
                oi.size,
                oi.color,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.hsn_code,
                0, -- CGST rate (IGST order)
                0, -- SGST rate (IGST order)
                5, -- IGST rate (below ₹2500)
                0, -- CGST amount
                0, -- SGST amount
                CASE 
                    WHEN oi.unit_price <= 2500 THEN ROUND(oi.total_price * 0.05, 2)
                    ELSE ROUND(oi.total_price * 0.18, 2)
                END, -- IGST amount
                CASE 
                    WHEN oi.unit_price <= 2500 THEN ROUND(oi.total_price * 0.05, 2)
                    ELSE ROUND(oi.total_price * 0.18, 2)
                END, -- Tax amount
                oi.total_price -- Net amount
            FROM order_items oi
            WHERE oi.id = sample_order_item_id;
        END LOOP;
    END IF;
    
    -- =====================================================
    -- RETURN 2: Partial return of CGST+SGST order (below ₹2500)
    -- =====================================================
    -- Get a sample order with CGST+SGST (below ₹2500)
    SELECT o.id INTO sample_order_id
    FROM orders o
    WHERE o.order_number LIKE 'SAMPLE-CGST-SGST-LOW-%'
    LIMIT 1;
    
    IF sample_order_id IS NOT NULL THEN
        -- Create return (partial - only one item)
        INSERT INTO order_returns (
            order_id,
            return_number,
            return_reason,
            return_status,
            refund_amount,
            refund_method,
            refund_status,
            return_date,
            created_at
        ) VALUES (
            sample_order_id,
            'SAMPLE-RET-' || date_str || '-00002',
            'Size mismatch. Customer returned one item for refund.',
            'completed',
            1999.00 + ROUND(1999.00 * 0.025, 2) + ROUND(1999.00 * 0.025, 2), -- Item + CGST + SGST
            'bank_transfer',
            'processed',
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '3 days'
        ) RETURNING id INTO return2_id;
        
        -- Get first order item only (partial return)
        SELECT id INTO sample_order_item_id
        FROM order_items 
        WHERE order_id = sample_order_id 
        LIMIT 1;
        
        IF sample_order_item_id IS NOT NULL THEN
            INSERT INTO order_return_items (
                return_id,
                order_item_id,
                product_id,
                product_name,
                product_sku,
                size,
                color,
                quantity,
                unit_price,
                total_price,
                hsn_code,
                cgst_rate,
                sgst_rate,
                igst_rate,
                cgst_amount,
                sgst_amount,
                igst_amount,
                tax_amount,
                net_amount
            )
            SELECT 
                return2_id,
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.product_sku,
                oi.size,
                oi.color,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.hsn_code,
                2.5, -- CGST rate (below ₹2500)
                2.5, -- SGST rate (below ₹2500)
                0, -- IGST rate
                ROUND(oi.total_price * 0.025, 2), -- CGST amount
                ROUND(oi.total_price * 0.025, 2), -- SGST amount
                0, -- IGST amount
                ROUND(oi.total_price * 0.05, 2), -- Tax amount (CGST + SGST)
                oi.total_price -- Net amount
            FROM order_items oi
            WHERE oi.id = sample_order_item_id;
        END IF;
    END IF;
    
    -- =====================================================
    -- RETURN 3: Full return of IGST order (above ₹2500)
    -- =====================================================
    -- Get a sample order with IGST (above ₹2500)
    SELECT o.id INTO sample_order_id
    FROM orders o
    WHERE o.order_number LIKE 'SAMPLE-IGST-HIGH-%'
    LIMIT 1;
    
    IF sample_order_id IS NOT NULL THEN
        -- Create return
        INSERT INTO order_returns (
            order_id,
            return_number,
            return_reason,
            return_status,
            refund_amount,
            refund_method,
            refund_status,
            return_date,
            created_at
        ) VALUES (
            sample_order_id,
            'SAMPLE-RET-' || date_str || '-00003',
            'Product quality not as expected. Customer requested full refund.',
            'completed',
            (SELECT total_amount FROM orders WHERE id = sample_order_id),
            'store_credit',
            'completed',
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '2 days'
        ) RETURNING id INTO return3_id;
        
        -- Get all order items and create return items
        FOR sample_order_item_id IN 
            SELECT id FROM order_items WHERE order_id = sample_order_id
        LOOP
            INSERT INTO order_return_items (
                return_id,
                order_item_id,
                product_id,
                product_name,
                product_sku,
                size,
                color,
                quantity,
                unit_price,
                total_price,
                hsn_code,
                cgst_rate,
                sgst_rate,
                igst_rate,
                cgst_amount,
                sgst_amount,
                igst_amount,
                tax_amount,
                net_amount
            )
            SELECT 
                return3_id,
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.product_sku,
                oi.size,
                oi.color,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.hsn_code,
                0, -- CGST rate (IGST order)
                0, -- SGST rate (IGST order)
                CASE 
                    WHEN oi.unit_price <= 2500 THEN 5
                    ELSE 18
                END, -- IGST rate
                0, -- CGST amount
                0, -- SGST amount
                CASE 
                    WHEN oi.unit_price <= 2500 THEN ROUND(oi.total_price * 0.05, 2)
                    ELSE ROUND(oi.total_price * 0.18, 2)
                END, -- IGST amount
                CASE 
                    WHEN oi.unit_price <= 2500 THEN ROUND(oi.total_price * 0.05, 2)
                    ELSE ROUND(oi.total_price * 0.18, 2)
                END, -- Tax amount
                oi.total_price -- Net amount
            FROM order_items oi
            WHERE oi.id = sample_order_item_id;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Sample return orders created successfully!';
    RAISE NOTICE 'Return 1: Full return of IGST order (below ₹2500)';
    RAISE NOTICE 'Return 2: Partial return of CGST+SGST order (below ₹2500)';
    RAISE NOTICE 'Return 3: Full return of IGST order (above ₹2500)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating sample return orders: %', SQLERRM;
END $$;

