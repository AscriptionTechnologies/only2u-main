import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const createdOrders: any[] = [];

    // Sample Order 1: IGST - Below ₹2500 (InterState)
    // Shipping to Karnataka (State Code: 29) - Different from seller state (36)
    const order1 = await createSampleOrder(
      user_id,
      `SAMPLE-IGST-LOW-${dateStr}-00001`,
      'Rajesh Kumar',
      '123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
      '123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
      [
        { name: 'Cotton T-Shirt', sku: 'TSH-001', price: 999, qty: 2, hsn: '6109' },
        { name: 'Denim Shorts', sku: 'SHORT-001', price: 1499, qty: 1, hsn: '6203' },
      ]
    );
    createdOrders.push(order1);

    // Sample Order 2: CGST + SGST - Below ₹2500 (IntraState)
    // Shipping to Telangana (State Code: 36) - Same as seller state
    const order2 = await createSampleOrder(
      user_id,
      `SAMPLE-CGST-SGST-LOW-${dateStr}-00002`,
      'Priya Sharma',
      '456 Hitech City, Hyderabad, Telangana, 500081, State Code: 36',
      '456 Hitech City, Hyderabad, Telangana, 500081, State Code: 36',
      [
        { name: 'Silk Saree', sku: 'SARE-001', price: 1999, qty: 1, hsn: '5007' },
        { name: 'Kurti Set', sku: 'KURT-001', price: 1299, qty: 1, hsn: '6109' },
      ]
    );
    createdOrders.push(order2);

    // Sample Order 3: IGST - Above ₹2500 (InterState)
    // Shipping to Maharashtra (State Code: 27) - Different from seller state
    const order3 = await createSampleOrder(
      user_id,
      `SAMPLE-IGST-HIGH-${dateStr}-00003`,
      'Amit Patel',
      '789 Bandra West, Mumbai, Maharashtra, 400050, State Code: 27',
      '789 Bandra West, Mumbai, Maharashtra, 400050, State Code: 27',
      [
        { name: 'Designer Lehenga', sku: 'LEH-001', price: 3500, qty: 1, hsn: '6204' },
        { name: 'Bridal Saree', sku: 'BRIDAL-001', price: 4500, qty: 1, hsn: '5007' },
      ]
    );
    createdOrders.push(order3);

    // Sample Order 4: CGST + SGST - Above ₹2500 (IntraState)
    // Shipping to Telangana (State Code: 36) - Same as seller state
    const order4 = await createSampleOrder(
      user_id,
      `SAMPLE-CGST-SGST-HIGH-${dateStr}-00004`,
      'Sneha Reddy',
      '321 Jubilee Hills, Hyderabad, Telangana, 500033, State Code: 36',
      '321 Jubilee Hills, Hyderabad, Telangana, 500033, State Code: 36',
      [
        { name: 'Premium Suit Set', sku: 'SUIT-001', price: 3200, qty: 1, hsn: '6203' },
        { name: 'Embroidered Gown', sku: 'GOWN-001', price: 2800, qty: 1, hsn: '6204' },
      ]
    );
    createdOrders.push(order4);

    // Sample Order 5: Mixed IGST - Both Above and Below ₹2500 (InterState)
    // Shipping to Maharashtra (State Code: 27) - Different from seller state
    const order5 = await createSampleOrder(
      user_id,
      `SAMPLE-IGST-MIXED-${dateStr}-00005`,
      'Vikram Singh',
      '456 Andheri East, Mumbai, Maharashtra, 400069, State Code: 27',
      '456 Andheri East, Mumbai, Maharashtra, 400069, State Code: 27',
      [
        // Items below ₹2500: 5% IGST
        { name: 'Cotton T-Shirt', sku: 'TSH-002', price: 999, qty: 2, hsn: '6109' },
        { name: 'Casual Jeans', sku: 'JEAN-001', price: 1999, qty: 1, hsn: '6203' },
        // Items above ₹2500: 18% IGST
        { name: 'Designer Lehenga', sku: 'LEH-002', price: 3500, qty: 1, hsn: '6204' },
        { name: 'Bridal Saree', sku: 'BRIDAL-002', price: 4500, qty: 1, hsn: '5007' },
      ]
    );
    createdOrders.push(order5);

    // Sample Order 6: Mixed CGST+SGST - Both Above and Below ₹2500 (IntraState)
    // Shipping to Telangana (State Code: 36) - Same as seller state
    const order6 = await createSampleOrder(
      user_id,
      `SAMPLE-CGST-SGST-MIXED-${dateStr}-00006`,
      'Anjali Rao',
      '789 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
      '789 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
      [
        // Items below ₹2500: 2.5% CGST + 2.5% SGST
        { name: 'Cotton Kurta', sku: 'KURTA-001', price: 999, qty: 2, hsn: '6109' },
        { name: 'Denim Jacket', sku: 'JACKET-001', price: 1999, qty: 1, hsn: '6203' },
        // Items above ₹2500: 9% CGST + 9% SGST
        { name: 'Designer Saree', sku: 'SARE-002', price: 3500, qty: 1, hsn: '5007' },
        { name: 'Bridal Lehenga', sku: 'LEH-003', price: 4500, qty: 1, hsn: '6204' },
      ]
    );
    createdOrders.push(order6);

    return NextResponse.json({
      success: true,
      message: 'Sample orders created successfully',
      orders: createdOrders.map(o => ({
        order_number: o.order_number,
        total_amount: o.total_amount,
        shipping_address: o.shipping_address,
      })),
    });
  } catch (error: any) {
    console.error('Error creating sample orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sample orders' },
      { status: 500 }
    );
  }
}

async function createSampleOrder(
  user_id: string,
  order_number: string,
  customerName: string,
  shipping_address: string,
  billing_address: string,
  items: Array<{ name: string; sku: string; price: number; qty: number; hsn: string }>
) {
  // Get or create a dummy product for sample orders
  let dummyProductId: string;
  
  // Try to get an existing product first
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .limit(1)
    .single();
  
  if (existingProduct) {
    dummyProductId = existingProduct.id;
  } else {
    // Create a dummy product if none exists
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name: 'Sample Product for Testing',
        description: 'This is a dummy product created for sample order testing',
        category_id: null,
        price: 0.00,
        mrp_price: 0.00,
        cost_price: 0.00,
        sku: 'SAMPLE-PROD-001',
        is_active: true,
        return_policy: '',
        replacement_policy_days: 0,
        hsn_code: '6109', // Default HSN code for testing
      })
      .select('id')
      .single();
    
    if (productError || !newProduct) {
      throw new Error(`Failed to create dummy product: ${productError?.message || 'Unknown error'}`);
    }
    
    dummyProductId = newProduct.id;
  }

  // Calculate total amount
  const total_amount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id,
      order_number,
      total_amount,
      shipping_address,
      billing_address,
      payment_method: 'Online',
      payment_status: 'paid',
      status: 'completed',
      notes: 'Sample order for tax testing',
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  // Create order items
  const orderItems = items.map((item, index) => ({
    order_id: order.id,
    product_id: dummyProductId, // Use valid product ID
    product_name: item.name,
    product_sku: item.sku,
    product_image: null,
    size: index % 2 === 0 ? 'M' : 'L',
    color: index % 2 === 0 ? 'Blue' : 'Red',
    quantity: item.qty,
    unit_price: item.price,
    total_price: item.price * item.qty,
    hsn_code: item.hsn, // Include HSN code from items array
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    // Clean up order if items insertion fails
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  return order;
}
