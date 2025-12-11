-- =====================================================
-- COMPLETE SAMPLE RETURN ORDERS FOR ALL SAMPLE ORDERS
-- Creates return orders for all 6 sample tax scenario orders
-- Covers: IGST Low, CGST+SGST Low, IGST High, CGST+SGST High, Mixed IGST, Mixed CGST+SGST
-- =====================================================

DO $$
DECLARE
    sample_user_id UUID;
    sample_order_id UUID;
    sample_order_item_id UUID;
    return_id UUID;
    date_str TEXT;
    deleted_count INTEGER;
    return_counter INTEGER := 1;
    order_record RECORD;
    item_record RECORD;
    net_amount DECIMAL(10,2);
    cgst_rate DECIMAL(5,2);
    sgst_rate DECIMAL(5,2);
    igst_rate DECIMAL(5,2);
    cgst_amount DECIMAL(10,2);
    sgst_amount DECIMAL(10,2);
    igst_amount DECIMAL(10,2);
    tax_amount DECIMAL(10,2);
    total_refund DECIMAL(10,2);
    is_interstate BOOLEAN;
BEGIN
    -- Delete existing sample returns first (to make script idempotent)
    DELETE FROM order_return_items WHERE order_return_items.return_id IN (
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
    
    -- Process all sample orders
    FOR order_record IN 
        SELECT id, order_number, total_amount, shipping_address
        FROM orders 
        WHERE order_number LIKE 'SAMPLE-%'
        ORDER BY order_number
    LOOP
        -- Determine if interstate based on shipping address
        is_interstate := order_record.shipping_address NOT LIKE '%State Code: 37%' 
                        AND order_record.shipping_address NOT LIKE '%State Code: 36%';
        
        -- Create return order
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
            order_record.id,
            'SAMPLE-RET-' || date_str || '-' || LPAD(return_counter::TEXT, 5, '0'),
            CASE 
                WHEN return_counter = 1 THEN 'Product damaged during shipping. Customer requested full refund.'
                WHEN return_counter = 2 THEN 'Size mismatch. Customer returned items for refund.'
                WHEN return_counter = 3 THEN 'Product quality not as expected. Customer requested full refund.'
                WHEN return_counter = 4 THEN 'Color not matching description. Customer returned for refund.'
                WHEN return_counter = 5 THEN 'Customer changed mind. Full return requested.'
                WHEN return_counter = 6 THEN 'Defective items received. Customer requested refund.'
                ELSE 'Customer requested return.'
            END,
            'completed',
            0, -- Will be calculated from items
            CASE 
                WHEN return_counter % 3 = 1 THEN 'original_payment'
                WHEN return_counter % 3 = 2 THEN 'bank_transfer'
                ELSE 'store_credit'
            END,
            CASE 
                WHEN return_counter % 2 = 1 THEN 'processed'
                ELSE 'completed'
            END,
            NOW() - (return_counter * INTERVAL '1 day'),
            NOW() - (return_counter * INTERVAL '1 day')
        ) RETURNING id INTO return_id;
        
        total_refund := 0;
        
        -- Process all items for this order
        FOR item_record IN 
            SELECT 
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.product_sku,
                oi.size,
                oi.color,
                oi.quantity,
                oi.unit_price,
                oi.total_price,
                oi.hsn_code
            FROM order_items oi
            WHERE oi.order_id = order_record.id
            ORDER BY oi.id
        LOOP
            -- Calculate tax rates based on unit price and interstate status
            IF is_interstate THEN
                -- Interstate: IGST
                IF item_record.unit_price <= 2500 THEN
                    igst_rate := 5;
                    cgst_rate := 0;
                    sgst_rate := 0;
                ELSE
                    igst_rate := 18;
                    cgst_rate := 0;
                    sgst_rate := 0;
                END IF;
            ELSE
                -- Intrastate: CGST + SGST
                IF item_record.unit_price <= 2500 THEN
                    cgst_rate := 2.5;
                    sgst_rate := 2.5;
                    igst_rate := 0;
                ELSE
                    cgst_rate := 9;
                    sgst_rate := 9;
                    igst_rate := 0;
                END IF;
            END IF;
            
            -- Calculate amounts
            net_amount := item_record.total_price;
            cgst_amount := ROUND(net_amount * cgst_rate / 100, 2);
            sgst_amount := ROUND(net_amount * sgst_rate / 100, 2);
            igst_amount := ROUND(net_amount * igst_rate / 100, 2);
            tax_amount := cgst_amount + sgst_amount + igst_amount;
            
            total_refund := total_refund + net_amount + tax_amount;
            
            -- Insert return item
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
            ) VALUES (
                return_id,
                item_record.id,
                item_record.product_id,
                item_record.product_name,
                item_record.product_sku,
                item_record.size,
                item_record.color,
                item_record.quantity,
                item_record.unit_price,
                item_record.total_price,
                item_record.hsn_code,
                cgst_rate,
                sgst_rate,
                igst_rate,
                cgst_amount,
                sgst_amount,
                igst_amount,
                tax_amount,
                net_amount
            );
        END LOOP;
        
        -- Update return order with calculated refund amount
        UPDATE order_returns 
        SET refund_amount = total_refund
        WHERE id = return_id;
        
        return_counter := return_counter + 1;
        
        RAISE NOTICE 'Created return for order: %', order_record.order_number;
    END LOOP;
    
    RAISE NOTICE 'Sample return orders created successfully!';
    RAISE NOTICE 'Total returns created: %', return_counter - 1;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating sample return orders: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all sample return orders with their original orders
-- SELECT 
--     r.return_number,
--     o.order_number,
--     r.return_reason,
--     r.refund_amount,
--     r.return_status,
--     r.refund_status,
--     r.return_date
-- FROM order_returns r
-- JOIN orders o ON r.order_id = o.id
-- WHERE r.return_number LIKE 'SAMPLE-RET-%'
-- ORDER BY r.return_date DESC;

-- View return items for a specific return
-- SELECT 
--     ri.*,
--     r.return_number,
--     o.order_number
-- FROM order_return_items ri
-- JOIN order_returns r ON ri.return_id = r.id
-- JOIN orders o ON r.order_id = o.id
-- WHERE r.return_number LIKE 'SAMPLE-RET-%'
-- ORDER BY r.return_number, ri.product_name;

-- =====================================================
-- CLEANUP (Optional - removes all sample returns)
-- =====================================================

-- DELETE FROM order_return_items WHERE return_id IN (
--     SELECT id FROM order_returns WHERE return_number LIKE 'SAMPLE-RET-%'
-- );
-- DELETE FROM order_returns WHERE return_number LIKE 'SAMPLE-RET-%';

