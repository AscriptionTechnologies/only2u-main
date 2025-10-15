import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      items,
      shipping_address,
      billing_address,
      payment_method,
      notes,
    } = body;

    if (!user_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id and items' },
        { status: 400 }
      );
    }

    // Generate unique order number
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_draft_order_number');

    if (orderNumberError) {
      console.error('Error generating order number:', orderNumberError);
      return NextResponse.json(
        { error: 'Failed to generate order number' },
        { status: 500 }
      );
    }

    const order_number = orderNumberData;

    // Calculate total amount
    const total_amount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    // Create draft order
    const { data: draftOrder, error: draftOrderError } = await supabase
      .from('customer_draft_orders')
      .insert({
        user_id,
        order_number,
        total_amount,
        shipping_address,
        billing_address,
        payment_method,
        payment_status: 'pending',
        status: 'draft',
        notes: notes || 'Order placed for out-of-stock items',
      })
      .select()
      .single();

    if (draftOrderError) {
      console.error('Error creating draft order:', draftOrderError);
      return NextResponse.json(
        { error: 'Failed to create draft order' },
        { status: 500 }
      );
    }

    // Create draft order items
    const orderItems = items.map((item: any) => ({
      draft_order_id: draftOrder.id,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      product_image: item.product_image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from('customer_draft_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating draft order items:', itemsError);
      // Rollback: delete the draft order
      await supabase
        .from('customer_draft_orders')
        .delete()
        .eq('id', draftOrder.id);
      
      return NextResponse.json(
        { error: 'Failed to create draft order items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft_order: draftOrder,
      message: 'Draft order created successfully',
    });

  } catch (error: any) {
    console.error('Error in draft order creation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

