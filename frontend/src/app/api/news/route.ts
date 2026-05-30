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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const comuna = searchParams.get('comuna');
    const featured = searchParams.get('featured');

    const supabase = getSupabase();
    let query = supabase.from('news').select('*')
      .eq('is_published', true).eq('is_approved', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (comuna) query = query.eq('comuna', comuna);
    if (featured) query = query.eq('is_featured', true);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data, count: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('news')
      .insert({ ...body, ai_generated: body.ai_generated ?? false })
      .select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
