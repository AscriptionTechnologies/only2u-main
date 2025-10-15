import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

export async function POST(request: NextRequest) {
  try {
    const { draft_order_id, rejection_reason } = await request.json();

    if (!draft_order_id) {
      return NextResponse.json(
        { error: 'Missing required field: draft_order_id' },
        { status: 400 }
      );
    }

    // Update draft order status to rejected
    const { data, error } = await supabase
      .from('customer_draft_orders')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason || 'Out of stock',
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft_order_id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting draft order:', error);
      return NextResponse.json(
        { error: 'Failed to reject draft order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft_order: data,
      message: 'Draft order rejected successfully',
    });

  } catch (error: any) {
    console.error('Error rejecting draft order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

