import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Obtener las últimas 3 noticias para el resumen
    const { data: news, error } = await supabase
      .from('news')
      .select('title,summary')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .limit(3);

    if (error || !news || news.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items = news.map((item, index) => ({
      number: `0${index + 1}`,
      text: item.summary || item.title,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
