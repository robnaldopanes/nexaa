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
      try {
        const matches = body.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (matches) {
          let ext = matches[1].toLowerCase();
          if (ext === 'jpeg') ext = 'jpg';
          if (ext.includes(';')) ext = ext.split(';')[0];

          const buffer = Buffer.from(matches[2], 'base64');
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
            .upload(filePath, buffer, { contentType: `image/${ext}`, upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
            body.image_url = urlData.publicUrl;
          }
        }
      } catch (uploadErr) {
        console.error('Error uploading image:', uploadErr);
      }
    }

    const { data, error } = await supabase.from('news').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('news').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
