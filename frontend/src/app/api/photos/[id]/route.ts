import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const supabase = getSupabase();

    // Si image_url es base64, subir a Storage primero
    if (body.image_url && typeof body.image_url === 'string' && body.image_url.startsWith('data:image')) {
      const matches = body.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
      
      if (!matches) {
        return NextResponse.json({ error: 'Formato de imagen inválido' }, { status: 400 });
      }

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
      
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'La imagen es muy grande (máximo 5MB)' }, { status: 400 });
      }

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

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return NextResponse.json({ error: 'Error al subir la imagen a Storage' }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
      body.image_url = urlData.publicUrl;
    }

    const { data, error } = await supabase.from('photos').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
