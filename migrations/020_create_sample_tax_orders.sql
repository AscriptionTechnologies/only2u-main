-- =====================================================
-- SAMPLE TAX ORDERS FOR TESTING
-- Creates 6 sample orders covering all tax scenarios:
-- 1. IGST - Below ₹2500 (InterState)
-- 2. CGST + SGST - Below ₹2500 (IntraState)
-- 3. IGST - Above ₹2500 (InterState)
-- 4. CGST + SGST - Above ₹2500 (IntraState)
-- 5. Mixed IGST - Both Above and Below ₹2500 (InterState)
-- 6. Mixed CGST+SGST - Both Above and Below ₹2500 (IntraState)
-- =====================================================

-- Note: Replace 'YOUR_USER_ID_HERE' with an actual user ID from your users table
-- You can get a user ID by running: SELECT id FROM users LIMIT 1;

DO $$
DECLARE
    sample_user_id UUID;
    dummy_product_id UUID;
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
    order4_id UUID;
    order5_id UUID;
    order6_id UUID;
    date_str TEXT;
    deleted_count INTEGER;
BEGIN
    -- Delete existing sample orders first (to make script idempotent)
    DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE order_number LIKE 'SAMPLE-%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM orders WHERE order_number LIKE 'SAMPLE-%';
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % existing sample order items', deleted_count;
    END IF;
    
    -- Get a user ID (use first available user)
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please create a user first.';
    END IF;
    
    -- Create or get a dummy product for sample orders
    -- First, try to get an existing product
    SELECT id INTO dummy_product_id FROM products LIMIT 1;
    
    -- If no product exists, create a dummy one
    IF dummy_product_id IS NULL THEN
        INSERT INTO products (
            name,
            description,
            category_id,
            price,
            mrp_price,
            cost_price,
            sku,
            is_active,
            return_policy,
            replacement_policy_days,
            hsn_code
        ) VALUES (
            'Sample Product for Testing',
            'This is a dummy product created for sample order testing',
            NULL,
            0.00,
            0.00,
            0.00,
            'SAMPLE-PROD-001',
            true,
            '',
            0,
            '6109'
        ) RETURNING id INTO dummy_product_id;
    END IF;
    
    -- Generate date string for order numbers
    date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- =====================================================
    -- ORDER 1: IGST - Below ₹2500 (InterState)
    -- Shipping to Karnataka (State Code: 29)
    -- Expected: 5% IGST
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-IGST-LOW-' || date_str || '-00001',
        3497.00, -- (999 * 2) + (1499 * 1)
        'Rajesh Kumar, 123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
        'Rajesh Kumar, 123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
        'Online',
        'paid',
        'completed',
        'Sample order: IGST below ₹2500 (InterState)',
        NOW()
    ) RETURNING id INTO order1_id;
    
    -- Order 1 Items
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        (order1_id, dummy_product_id, 'Cotton T-Shirt', 'TSH-001', 2, 999.00, 1998.00, 'M', 'Blue', '6109'),
        (order1_id, dummy_product_id, 'Denim Shorts', 'SHORT-001', 1, 1499.00, 1499.00, 'L', 'Blue', '6203');
    
    -- =====================================================
    -- ORDER 2: CGST + SGST - Below ₹2500 (IntraState)
    -- Shipping to Andhra Pradesh (State Code: 37)
    -- Expected: 2.5% CGST + 2.5% SGST
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-CGST-SGST-LOW-' || date_str || '-00002',
        3298.00, -- (1999 * 1) + (1299 * 1)
        'Priya Sharma, 456 Main Road, Nellore, Andhra Pradesh, 524001, State Code: 37',
        'Priya Sharma, 456 Main Road, Nellore, Andhra Pradesh, 524001, State Code: 37',
        'Online',
        'paid',
        'completed',
        'Sample order: CGST+SGST below ₹2500 (IntraState)',
        NOW()
    ) RETURNING id INTO order2_id;
    
    -- Order 2 Items
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        (order2_id, dummy_product_id, 'Silk Saree', 'SARE-001', 1, 1999.00, 1999.00, 'Free', 'Red', '5007'),
        (order2_id, dummy_product_id, 'Kurti Set', 'KURT-001', 1, 1299.00, 1299.00, 'M', 'Pink', '6109');
    
    -- =====================================================
    -- ORDER 3: IGST - Above ₹2500 (InterState)
    -- Shipping to Maharashtra (State Code: 27)
    -- Expected: 18% IGST
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-IGST-HIGH-' || date_str || '-00003',
        8000.00, -- (3500 * 1) + (4500 * 1)
        'Amit Patel, 789 Bandra West, Mumbai, Maharashtra, 400050, State Code: 27',
        'Amit Patel, 789 Bandra West, Mumbai, Maharashtra, 400050, State Code: 27',
        'Online',
        'paid',
        'completed',
        'Sample order: IGST above ₹2500 (InterState)',
        NOW()
    ) RETURNING id INTO order3_id;
    
    -- Order 3 Items
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        (order3_id, dummy_product_id, 'Designer Lehenga', 'LEH-001', 1, 3500.00, 3500.00, 'M', 'Gold', '6204'),
        (order3_id, dummy_product_id, 'Bridal Saree', 'BRIDAL-001', 1, 4500.00, 4500.00, 'Free', 'Red', '5007');
    
    -- =====================================================
    -- ORDER 4: CGST + SGST - Above ₹2500 (IntraState)
    -- Shipping to Andhra Pradesh (State Code: 37)
    -- Expected: 9% CGST + 9% SGST
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-CGST-SGST-HIGH-' || date_str || '-00004',
        6000.00, -- (3200 * 1) + (2800 * 1)
        'Sneha Reddy, 321 VRC Centre, Nellore, Andhra Pradesh, 524001, State Code: 37',
        'Sneha Reddy, 321 VRC Centre, Nellore, Andhra Pradesh, 524001, State Code: 37',
        'Online',
        'paid',
        'completed',
        'Sample order: CGST+SGST above ₹2500 (IntraState)',
        NOW()
    ) RETURNING id INTO order4_id;
    
    -- Order 4 Items
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        (order4_id, dummy_product_id, 'Premium Suit Set', 'SUIT-001', 1, 3200.00, 3200.00, 'L', 'Navy', '6203'),
        (order4_id, dummy_product_id, 'Embroidered Gown', 'GOWN-001', 1, 2800.00, 2800.00, 'M', 'Black', '6204');
    
    -- =====================================================
    -- ORDER 5: Mixed IGST - Both Above and Below ₹2500 (InterState)
    -- Shipping to Maharashtra (State Code: 27)
    -- Expected: 5% IGST for items ≤ ₹2500, 18% IGST for items > ₹2500
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-IGST-MIXED-' || date_str || '-00005',
        0.00, -- Will be calculated from items
        'Vikram Singh, 456 Andheri East, Mumbai, Maharashtra, 400069, State Code: 27',
        'Vikram Singh, 456 Andheri East, Mumbai, Maharashtra, 400069, State Code: 27',
        'Online',
        'paid',
        'completed',
        'Sample order: Mixed IGST (both above and below ₹2500)',
        NOW()
    ) RETURNING id INTO order5_id;
    
    -- Order 5 Items - Mixed IGST rates
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        -- Items below ₹2500: 5% IGST
        (order5_id, dummy_product_id, 'Cotton T-Shirt', 'TSH-002', 2, 999.00, 1998.00, 'M', 'White', '6109'),
        (order5_id, dummy_product_id, 'Casual Jeans', 'JEAN-001', 1, 1999.00, 1999.00, 'L', 'Blue', '6203'),
        -- Items above ₹2500: 18% IGST
        (order5_id, dummy_product_id, 'Designer Lehenga', 'LEH-002', 1, 3500.00, 3500.00, 'M', 'Pink', '6204'),
        (order5_id, dummy_product_id, 'Bridal Saree', 'BRIDAL-002', 1, 4500.00, 4500.00, 'Free', 'Red', '5007');
    
    -- Update order total amount
    UPDATE orders 
    SET total_amount = (
        SELECT SUM(total_price) 
        FROM order_items 
        WHERE order_id = order5_id
    )
    WHERE id = order5_id;
    
    -- =====================================================
    -- ORDER 6: Mixed CGST+SGST - Both Above and Below ₹2500 (IntraState)
    -- Shipping to Telangana (State Code: 36) - Same as seller state
    -- Expected: 2.5% CGST + 2.5% SGST for items ≤ ₹2500, 9% CGST + 9% SGST for items > ₹2500
    -- =====================================================
    INSERT INTO orders (
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        status,
        notes,
        created_at
    ) VALUES (
        sample_user_id,
        'SAMPLE-CGST-SGST-MIXED-' || date_str || '-00006',
        0.00, -- Will be calculated from items
        'Anjali Rao, 789 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
        'Anjali Rao, 789 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
        'Online',
        'paid',
        'completed',
        'Sample order: Mixed CGST+SGST (both above and below ₹2500)',
        NOW()
    ) RETURNING id INTO order6_id;
    
    -- Order 6 Items - Mixed CGST+SGST rates
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        total_price,
        size,
        color,
        hsn_code
    ) VALUES
        -- Items below ₹2500: 2.5% CGST + 2.5% SGST
        (order6_id, dummy_product_id, 'Cotton Kurta', 'KURTA-001', 2, 999.00, 1998.00, 'M', 'Green', '6109'),
        (order6_id, dummy_product_id, 'Denim Jacket', 'JACKET-001', 1, 1999.00, 1999.00, 'L', 'Blue', '6203'),
        -- Items above ₹2500: 9% CGST + 9% SGST
        (order6_id, dummy_product_id, 'Designer Saree', 'SARE-002', 1, 3500.00, 3500.00, 'Free', 'Maroon', '5007'),
        (order6_id, dummy_product_id, 'Bridal Lehenga', 'LEH-003', 1, 4500.00, 4500.00, 'M', 'Gold', '6204');
    
    -- Update order total amount
    UPDATE orders 
    SET total_amount = (
        SELECT SUM(total_price) 
        FROM order_items 
        WHERE order_id = order6_id
    )
    WHERE id = order6_id;
    
    RAISE NOTICE 'Sample orders created successfully!';
    RAISE NOTICE 'Order 1 (IGST Low): SAMPLE-IGST-LOW-%', date_str;
    RAISE NOTICE 'Order 2 (CGST+SGST Low): SAMPLE-CGST-SGST-LOW-%', date_str;
    RAISE NOTICE 'Order 3 (IGST High): SAMPLE-IGST-HIGH-%', date_str;
    RAISE NOTICE 'Order 4 (CGST+SGST High): SAMPLE-CGST-SGST-HIGH-%', date_str;
    RAISE NOTICE 'Order 5 (Mixed IGST): SAMPLE-IGST-MIXED-%', date_str;
    RAISE NOTICE 'Order 6 (Mixed CGST+SGST): SAMPLE-CGST-SGST-MIXED-%', date_str;
    
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all sample orders
-- SELECT order_number, total_amount, shipping_address, status, created_at 
-- FROM orders 
-- WHERE order_number LIKE 'SAMPLE-%' 
-- ORDER BY created_at DESC;

-- View order items for a specific order
-- SELECT oi.*, o.order_number, o.shipping_address
-- FROM order_items oi
-- JOIN orders o ON oi.order_id = o.id
-- WHERE o.order_number LIKE 'SAMPLE-%'
-- ORDER BY o.order_number, oi.product_name;

-- =====================================================
-- CLEANUP (Optional - removes all sample orders)
-- =====================================================

-- DELETE FROM order_items WHERE order_id IN (
--     SELECT id FROM orders WHERE order_number LIKE 'SAMPLE-%'
-- );
-- DELETE FROM orders WHERE order_number LIKE 'SAMPLE-%';

