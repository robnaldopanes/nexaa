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
    const full = searchParams.get('full'); // Si se pasa full=1, devolver todos los campos

    const supabase = getSupabase();
    
    // Seleccionar solo los campos necesarios para el feed (reduce tamaño de 650KB a ~50KB)
    const selectFields = full 
      ? '*' 
      : 'id,title,summary,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,slug,views';

    let query = supabase.from('news').select(selectFields)
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

    // Si image_url es base64, intentar subir a Storage
    if (body.image_url && typeof body.image_url === 'string' && body.image_url.startsWith('data:image')) {
      try {
        const matches = body.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
        
        if (matches) {
          let ext = matches[1].toLowerCase();
          if (ext.includes(';')) ext = ext.split(';')[0];
          
          const mimeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
          };
          const contentType = mimeMap[ext] || 'image/jpeg';
          const fileExt = ext === 'jpeg' ? 'jpg' : ext;

          const buffer = Buffer.from(matches[2], 'base64');
          
          if (buffer.length <= 5 * 1024 * 1024) {
            const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
            const filePath = `uploads/${uniqueName}`;

            const { data: buckets } = await supabase.storage.listBuckets();
            if (!buckets?.some(b => b.name === 'news-images')) {
              await supabase.storage.createBucket('news-images', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              });
            }

            const { error: uploadError } = await supabase.storage
              .from('news-images')
              .upload(filePath, buffer, { contentType, upsert: false });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
              body.image_url = urlData.publicUrl;
            }
            // Si falla el upload, mantener el base64 (no retornar error)
          }
        }
      } catch (uploadErr) {
        console.error('Error uploading image:', uploadErr);
        // Mantener el base64 como fallback
      }
    }

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
