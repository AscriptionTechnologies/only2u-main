import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      'https://ljnheixbsweamlbntwvh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const body = await request.json();
    const { email, password, phone, name, role, is_active, location, profilePhoto, skinTone, waistSize, bustSize, hipSize, size, height, weight, coin_balance } = body;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      phone,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Insert user data into users table
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
      role: role.toLowerCase(), // Convert role to lowercase
      is_active,
      location,
      phone,
      profilePhoto,
      skinTone,
      waistSize,
      bustSize,
      hipSize,
      size,
      height,
      weight,
      coin_balance,
    });

    if (userError) {
      console.error('User data error:', userError);
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: authData.user.id, email, name, role } 
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 