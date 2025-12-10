/**
 * Generate Sample Orders for Tax Scenarios
 * 
 * This script creates sample orders for different tax scenarios:
 * 1. IGST (InterState) - Items below ₹2500
 * 2. CGST + SGST (IntraState) - Items below ₹2500
 * 3. IGST (InterState) - Items above ₹2500
 * 4. CGST + SGST (IntraState) - Items above ₹2500
 */

import { createClient } from '@supabase/supabase-js';
import { generateOrderPdf } from '../lib/pdfUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

// Sample user ID (you may need to create a test user first)
const SAMPLE_USER_ID = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID

interface SampleOrder {
  name: string;
  description: string;
  shipping_address: string;
  billing_address: string;
  items: Array<{
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    hsn_code: string;
    size?: string;
    color?: string;
  }>;
}

const sampleOrders: SampleOrder[] = [
  {
    name: 'IGST - Below ₹2500 (InterState)',
    description: 'Interstate order with items priced below ₹2500 - Should show 5% IGST',
    shipping_address: 'John Doe, 123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
    billing_address: 'John Doe, 123 MG Road, Bangalore, Karnataka, 560001, State Code: 29',
    items: [
      {
        product_name: 'Cotton T-Shirt',
        product_sku: 'TSH-001',
        quantity: 2,
        unit_price: 999,
        hsn_code: '6109',
        size: 'M',
        color: 'Blue'
      },
      {
        product_name: 'Denim Shorts',
        product_sku: 'SH-002',
        quantity: 1,
        unit_price: 1499,
        hsn_code: '6203',
        size: 'L',
        color: 'Blue'
      }
    ]
  },
  {
    name: 'CGST + SGST - Below ₹2500 (IntraState)',
    description: 'Intrastate order with items priced below ₹2500 - Should show 2.5% CGST + 2.5% SGST',
    shipping_address: 'Jane Smith, 456 Hitech City, Hyderabad, Telangana, 500081, State Code: 36',
    billing_address: 'Jane Smith, 456 Hitech City, Hyderabad, Telangana, 500081, State Code: 36',
    items: [
      {
        product_name: 'Silk Saree',
        product_sku: 'SR-003',
        quantity: 1,
        unit_price: 1999,
        hsn_code: '5007',
        size: 'Free',
        color: 'Red'
      },
      {
        product_name: 'Kurti Set',
        product_sku: 'KS-004',
        quantity: 1,
        unit_price: 1299,
        hsn_code: '6104',
        size: 'M',
        color: 'Green'
      }
    ]
  },
  {
    name: 'IGST - Above ₹2500 (InterState)',
    description: 'Interstate order with items priced above ₹2500 - Should show 18% IGST',
    shipping_address: 'Robert Johnson, 789 Park Street, Mumbai, Maharashtra, 400001, State Code: 27',
    billing_address: 'Robert Johnson, 789 Park Street, Mumbai, Maharashtra, 400001, State Code: 27',
    items: [
      {
        product_name: 'Designer Lehenga',
        product_sku: 'LH-005',
        quantity: 1,
        unit_price: 3500,
        hsn_code: '6204',
        size: 'M',
        color: 'Gold'
      },
      {
        product_name: 'Bridal Saree',
        product_sku: 'BS-006',
        quantity: 1,
        unit_price: 4500,
        hsn_code: '5007',
        size: 'Free',
        color: 'Maroon'
      }
    ]
  },
  {
    name: 'CGST + SGST - Above ₹2500 (IntraState)',
    description: 'Intrastate order with items priced above ₹2500 - Should show 9% CGST + 9% SGST',
    shipping_address: 'Priya Reddy, 321 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
    billing_address: 'Priya Reddy, 321 Banjara Hills, Hyderabad, Telangana, 500034, State Code: 36',
    items: [
      {
        product_name: 'Premium Suit Set',
        product_sku: 'SS-007',
        quantity: 1,
        unit_price: 3200,
        hsn_code: '6103',
        size: 'L',
        color: 'Navy Blue'
      },
      {
        product_name: 'Embroidered Gown',
        product_sku: 'GN-008',
        quantity: 1,
        unit_price: 2800,
        hsn_code: '6204',
        size: 'M',
        color: 'Pink'
      }
    ]
  }
];

async function generateSampleOrders() {
  console.log('🚀 Starting sample order generation...\n');

  for (const sampleOrder of sampleOrders) {
    try {
      console.log(`📦 Creating order: ${sampleOrder.name}`);
      
      // Generate order number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now().toString().slice(-6);
      const orderNumber = `SAMPLE-${dateStr}-${timestamp}`;

      // Calculate total amount
      const total_amount = sampleOrder.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: SAMPLE_USER_ID,
          order_number: orderNumber,
          total_amount,
          shipping_address: sampleOrder.shipping_address,
          billing_address: sampleOrder.billing_address,
          payment_method: 'Sample Order',
          payment_status: 'paid',
          status: 'completed',
          notes: sampleOrder.description,
        })
        .select()
        .single();

      if (orderError) {
        console.error(`❌ Error creating order: ${orderError.message}`);
        continue;
      }

      console.log(`✅ Order created: ${orderNumber}`);

      // Create order items
      const orderItems = sampleOrder.items.map((item) => ({
        order_id: order.id,
        product_id: '00000000-0000-0000-0000-000000000000', // Dummy product ID
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        hsn_code: item.hsn_code,
        size: item.size,
        color: item.color,
      }));

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error(`❌ Error creating order items: ${itemsError.message}`);
        continue;
      }

      console.log(`✅ Created ${items.length} order items`);

      // Fetch user data for PDF
      const { data: user } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', SAMPLE_USER_ID)
        .single();

      // Prepare order data for PDF generation
      const orderData = {
        ...order,
        order_items: items,
        user: user || {
          name: sampleOrder.shipping_address.split(',')[0],
          email: 'sample@example.com',
          phone: '9999999999'
        }
      };

      console.log(`📄 Generating PDF for ${sampleOrder.name}...`);
      
      // Note: PDF generation happens in browser, so we'll create an API endpoint instead
      console.log(`✅ Order ready for PDF generation: ${orderNumber}`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Description: ${sampleOrder.description}\n`);

    } catch (error: any) {
      console.error(`❌ Unexpected error: ${error.message}`);
    }
  }

  console.log('✨ Sample order generation completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Go to Order Management page');
  console.log('2. Find the sample orders (order numbers starting with SAMPLE-)');
  console.log('3. Click "Generate PDF" for each order to see the tax breakdown');
}

// Run if executed directly
if (require.main === module) {
  generateSampleOrders()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { generateSampleOrders, sampleOrders };

