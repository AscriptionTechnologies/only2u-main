import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { supportsLocalStorage } from '@supabase/auth-js/dist/main/lib/helpers';

export async function GET() {
  // Initialize supabase client
  const client = supabase;
  
  const isSupported = supportsLocalStorage();
  const setItemType = typeof globalThis.localStorage?.setItem;
  const getItemType = typeof globalThis.localStorage?.getItem;
  return NextResponse.json({
    isSupported,
    setItemType,
    getItemType
  });
}
