import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Buscar noticias con base64
    const { data: news, error } = await supabase
      .from('news')
      .select('id, title, image_url')
      .like('image_url', 'data:image%');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const results = [];
    
    for (const item of news || []) {
      const matches = item.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!matches) continue;
      
      let ext = matches[1].toLowerCase();
      if (ext.includes(';')) ext = ext.split(';')[0];
      const fileExt = ext === 'jpeg' ? 'jpg' : ext;
      
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
      };
      const contentType = mimeMap[ext] || 'image/jpeg';
      
      const buffer = Buffer.from(matches[2], 'base64');
      
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const filePath = `uploads/${uniqueName}`;
      
      // Asegurar bucket
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some(b => b.name === 'news-images')) {
        await supabase.storage.createBucket('news-images', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
      }
      
      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(filePath, buffer, { contentType, upsert: false });
      
      if (uploadError) {
        results.push({ id: item.id, title: item.title, status: 'error', error: uploadError.message });
        continue;
      }
      
      // Obtener URL
      const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
      
      // Actualizar
      const { error: updateError } = await supabase
        .from('news')
        .update({ image_url: urlData.publicUrl })
        .eq('id', item.id);
      
      if (updateError) {
        results.push({ id: item.id, title: item.title, status: 'error', error: updateError.message });
      } else {
        results.push({ id: item.id, title: item.title, status: 'ok', url: urlData.publicUrl });
      }
    }
    
    return NextResponse.json({ 
      total: news?.length || 0,
      migrated: results.filter(r => r.status === 'ok').length,
      errors: results.filter(r => r.status === 'error').length,
      results 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
