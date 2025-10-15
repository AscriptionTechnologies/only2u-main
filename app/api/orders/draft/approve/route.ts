import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

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

    // Generate regular order number
    const regularOrderNumber = draftOrder.order_number.replace('DRAFT-', 'ORD-');

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

