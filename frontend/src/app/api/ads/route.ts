import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const supabase = getSupabase();
    let query = supabase.from('ads').select('*');
    if (active) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      // Si la tabla no existe, devolver array vacío
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}
