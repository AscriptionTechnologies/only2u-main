import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

// Shopify Sync Server URL (Cloud Run)
const SHOPIFY_SYNC_URL = process.env.SHOPIFY_SYNC_URL || 'https://shopify-sync-server-513635514996.asia-south1.run.app';

/**
 * Sync order to Shopify via the sync server
 */
async function syncOrderToShopify(
    orderId: string,
    lineItems: Array<{ sku: string; quantity: number }>,
    customer?: { name?: string; email?: string; phone?: string },
    shippingAddress?: { address1?: string; city?: string; state?: string; country?: string; zip?: string }
) {
    try {
        const response = await fetch(`${SHOPIFY_SYNC_URL}/orders/only2u`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                lineItems,
                customer,
                shippingAddress,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Shopify sync failed:', errorData);
            return { success: false, error: errorData };
        }

        const result = await response.json();
        console.log('Order synced to Shopify:', result);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error syncing to Shopify:', error);
        return { success: false, error: String(error) };
    }
}

export async function POST(request: NextRequest) {
    try {
        const { order_id } = await request.json();

        if (!order_id) {
            return NextResponse.json(
                { error: 'Missing required field: order_id' },
                { status: 400 }
            );
        }

        // 1. Fetch the order with items
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select(`
        *,
        items:order_items(
          *,
          product:products(sku)
        )
      `)
            .eq('id', order_id)
            .single();

        if (fetchError || !order) {
            console.error('Error fetching order:', fetchError);
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // 2. Sync to Shopify
        console.log('[Order Approve] Raw order items:', JSON.stringify(order.items));

        // Extract line items with SKU for Shopify sync
        let shopifyLineItems: any[] = [];

        // Initial attempt: use existing SKU fields
        shopifyLineItems = (order.items as any[])
            .filter((item: any) => item.product_sku || item.product?.sku)
            .map((item: any) => ({
                sku: item.product_sku || item.product?.sku,
                quantity: item.quantity,
            }));

        // Fallback: if no SKUs found, try to find them via product_variants using size/color
        if (shopifyLineItems.length === 0 && order.items && order.items.length > 0) {
            console.log('[Order Approve] No SKUs in items, attempting to fetch from product_variants with manual mapping...');

            const productIds = order.items.map((i: any) => i.product_id).filter(Boolean);

            if (productIds.length > 0) {
                // Fetch variants, sizes, and colors in parallel
                const [variantsRes, sizesRes, colorsRes] = await Promise.all([
                    supabase
                        .from('product_variants')
                        .select('id, product_id, sku, size_id, color_id')
                        .in('product_id', productIds),
                    supabase
                        .from('sizes')
                        .select('id, name'),
                    supabase
                        .from('colors')
                        .select('id, name')
                ]);

                if (variantsRes.error) {
                    console.error('[Order Approve] Error fetching variants:', variantsRes.error);
                } else if (variantsRes.data) {
                    const variants = variantsRes.data;
                    const sizes = sizesRes.data || [];
                    const colors = colorsRes.data || [];

                    // Create ID lookup maps
                    const sizeMap = new Map(sizes.map(s => [s.id, s.name]));
                    const colorMap = new Map(colors.map(c => [c.id, c.name]));

                    // Match items to variants
                    shopifyLineItems = (order.items as any[]).map((item: any) => {
                        // Find matching variant
                        const variant = variants.find((v: any) => {
                            if (v.product_id !== item.product_id) return false;

                            // Resolve names from IDs
                            const vSize = v.size_id ? sizeMap.get(v.size_id) : undefined;
                            const vColor = v.color_id ? colorMap.get(v.color_id) : undefined;

                            // Normalize for comparison
                            const hasSize = !!item.size && item.size !== 'N/A';
                            const hasColor = !!item.color && item.color !== 'N/A';

                            // Match logic
                            const sizeMatch = !hasSize || (vSize === item.size || vSize?.toLowerCase() === item.size?.toLowerCase());
                            const colorMatch = !hasColor || (vColor === item.color || vColor?.toLowerCase() === item.color?.toLowerCase());

                            return sizeMatch && colorMatch;
                        });

                        if (variant && variant.sku) {
                            console.log(`[Order Approve] Matched variant ${variant.id} for product ${item.product_name}`);
                            return {
                                sku: variant.sku,
                                quantity: item.quantity
                            };
                        }
                        return null;
                    }).filter(Boolean);

                    console.log(`[Order Approve] Resolved ${shopifyLineItems.length} SKUs from variants`);
                }
            }
        }

        // Parse shipping address for Shopify
        let parsedShippingAddress: any = undefined;
        if (order.shipping_address) {
            try {
                const addr = typeof order.shipping_address === 'string'
                    ? JSON.parse(order.shipping_address)
                    : order.shipping_address;

                // Handle potentially different address formats (string vs object)
                if (typeof addr === 'string') {
                    // Simple string address, try to use it as address1
                    parsedShippingAddress = { address1: addr };
                } else {
                    parsedShippingAddress = {
                        address1: addr.address1 || addr.address || addr.street,
                        city: addr.city,
                        state: addr.state || addr.province,
                        country: addr.country || 'IN',
                        zip: addr.zip || addr.postal_code || addr.pincode,
                    };
                }
            } catch (e) {
                // If it's just a raw string, use it
                parsedShippingAddress = { address1: order.shipping_address };
            }
        }

        // Customer info
        // Orders table has flattened customer info
        const customer = {
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone
        };

        // Sync to Shopify (non-blocking, don't fail order approval if sync fails)
        let syncResult: { success: boolean; error?: string; data?: any } = { success: false, error: 'Skipped' };

        console.log(`[Order Approve] Preparing to sync Order ${order.order_number} to Shopify. Item count: ${shopifyLineItems.length}`);

        if (shopifyLineItems.length > 0) {
            console.log('[Order Approve] Payload items:', JSON.stringify(shopifyLineItems));

            syncResult = await syncOrderToShopify(
                order.order_number,
                shopifyLineItems,
                customer,
                parsedShippingAddress
            );

            if (!syncResult.success) {
                console.error('Shopify sync failed but order was approved:', syncResult.error);
            } else {
                console.log('Shopify sync success:', syncResult.data);
            }
        } else {
            console.warn('[Order Approve] No items with SKUs found to sync to Shopify');
        }

        // 3. Update order status to approved
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'approved',
                // Optional: you might want to track who approved it if that info was passed
            })
            .eq('id', order_id);

        if (updateError) {
            console.error('Error updating order status:', updateError);
            return NextResponse.json(
                { error: 'Failed to update order status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            order: { ...order, status: 'approved' },
            shopifySync: syncResult,
            message: 'Order approved successfully',
        });

    } catch (error: any) {
        console.error('Error approving order:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
