import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

export async function POST(request: NextRequest) {
  try {
    const { product_id, vendor_id, customer_id, question_text } = await request.json();

    if (!customer_id || !question_text) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id and question_text' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('vendor_questions')
      .insert({
        product_id,
        vendor_id,
        customer_id,
        question_text,
        is_answered: false,
        is_approved: true, // Auto-approve or set to false for moderation
        is_visible: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json(
        { error: 'Failed to create question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      question: data,
      message: 'Question created successfully',
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

