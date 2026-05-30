import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { image, filename } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Se requiere imagen en base64' }, { status: 400 });
    }

    const matches = image.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Formato de imagen inválido' }, { status: 400 });
    }

    let ext = matches[1].toLowerCase();
    if (ext.includes(';')) ext = ext.split(';')[0];
    
    // Mapear extensión a MIME type válido
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
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `uploads/${uniqueName}`;

    const supabase = createClient(supabaseUrl, serviceKey);
    const BUCKET = 'news-images';

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
