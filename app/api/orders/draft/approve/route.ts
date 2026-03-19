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
    const { draft_order_id, approved_by } = await request.json();

    if (!draft_order_id) {
      return NextResponse.json(
        { error: 'Missing required field: draft_order_id' },
        { status: 400 }
      );
    }

    // Fetch the draft order with items
    const { data: draftOrder, error: fetchError } = await supabase
      .from('customer_draft_orders')
      .select(`
        *,
        items:customer_draft_order_items(*)
      `)
      .eq('id', draft_order_id)
      .single();

    if (fetchError || !draftOrder) {
      console.error('Error fetching draft order:', fetchError);
      return NextResponse.json(
        { error: 'Draft order not found' },
        { status: 404 }
      );
    }

    // Generate regular order number using the function to ensure proper sequencing
    let regularOrderNumber: string;

    try {
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError || !orderNumberData) {
        console.warn('RPC function failed, using fallback method:', orderNumberError?.message);

        // Fallback: Generate order number directly
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `ORD-${dateStr}-`;

        // Get count of existing orders for today
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .like('order_number', `${prefix}%`);

        const counter = (count || 0) + 1;
        regularOrderNumber = `${prefix}${String(counter).padStart(5, '0')}`;

        // Ensure uniqueness
        let checkCounter = counter;
        while (true) {
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', regularOrderNumber)
            .limit(1);

          if (!existing || existing.length === 0) {
            break; // Number is unique
          }

          checkCounter++;
          regularOrderNumber = `${prefix}${String(checkCounter).padStart(5, '0')}`;
        }
      } else {
        regularOrderNumber = orderNumberData;
      }
    } catch (error) {
      console.error('Error in order number generation:', error);
      // Final fallback: Use timestamp-based number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now().toString().slice(-8);
      regularOrderNumber = `ORD-${dateStr}-${timestamp}`;
    }

    // Create regular order from draft
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: draftOrder.user_id,
        order_number: regularOrderNumber,
        total_amount: draftOrder.total_amount,
        shipping_address: draftOrder.shipping_address,
        billing_address: draftOrder.billing_address,
        payment_method: draftOrder.payment_method,
        payment_status: draftOrder.payment_status,
        status: 'pending', // New orders start as pending
        notes: draftOrder.notes,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order from draft' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = (draftOrder.items as any[]).map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      product_image: item.product_image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', newOrder.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // ===== SYNC ORDER TO SHOPIFY =====
    // Extract line items with SKU for Shopify sync
    const shopifyLineItems = (draftOrder.items as any[])
      .filter((item: any) => item.product_sku)
      .map((item: any) => ({
        sku: item.product_sku,
        quantity: item.quantity,
      }));

    // Parse shipping address for Shopify
    let parsedShippingAddress: any = undefined;
    if (draftOrder.shipping_address) {
      try {
        const addr = typeof draftOrder.shipping_address === 'string'
          ? JSON.parse(draftOrder.shipping_address)
          : draftOrder.shipping_address;
        parsedShippingAddress = {
          address1: addr.address1 || addr.address || addr.street,
          city: addr.city,
          state: addr.state || addr.province,
          country: addr.country || 'IN',
          zip: addr.zip || addr.postal_code || addr.pincode,
        };
      } catch (e) {
        console.warn('Could not parse shipping address:', e);
      }
    }

    // Fetch customer info from the users table
    let customerInfo: { name?: string; email?: string; phone?: string } | undefined;
    if (draftOrder.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', draftOrder.user_id)
        .single();

      if (userData) {
        customerInfo = {
          name: userData.name || undefined,
          email: userData.email || undefined,
          phone: userData.phone || undefined,
        };
      }
    }

    // Sync to Shopify (non-blocking, don't fail order if sync fails)
    if (shopifyLineItems.length > 0) {
      const syncResult = await syncOrderToShopify(
        regularOrderNumber,
        shopifyLineItems,
        customerInfo,
        parsedShippingAddress
      );

      if (!syncResult.success) {
        console.error('Shopify sync failed but order was created:', syncResult.error);
      }
    }

    // Update draft order status to approved
    const { error: updateError } = await supabase
      .from('customer_draft_orders')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by,
      })
      .eq('id', draft_order_id);

    if (updateError) {
      console.error('Error updating draft order:', updateError);
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'Draft order approved and converted to regular order',
    });

  } catch (error: any) {
    console.error('Error approving draft order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

