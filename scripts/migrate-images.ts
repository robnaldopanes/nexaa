import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function migrateBase64Images() {
  const supabase = createClient(supabaseUrl, serviceKey);
  
  console.log('Buscando noticias con imágenes base64...');
  
  const { data: news, error } = await supabase
    .from('news')
    .select('id, title, image_url')
    .like('image_url', 'data:image%');
  
  if (error) {
    console.error('Error al buscar noticias:', error);
    return;
  }
  
  console.log(`Encontradas ${news?.length || 0} noticias con base64`);
  
  for (const item of news || []) {
    console.log(`\nProcesando: ${item.title?.substring(0, 50)}`);
    
    const matches = item.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!matches) {
      console.log('  Formato inválido, saltando');
      continue;
    }
    
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
    console.log(`  Tamaño: ${Math.round(buffer.length / 1024)}KB`);
    
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `uploads/${uniqueName}`;
    
    // Asegurar que el bucket existe
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
      console.error('  Error al subir:', uploadError.message);
      continue;
    }
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
    
    // Actualizar noticia con URL
    const { error: updateError } = await supabase
      .from('news')
      .update({ image_url: urlData.publicUrl })
      .eq('id', item.id);
    
    if (updateError) {
      console.error('  Error al actualizar:', updateError.message);
    } else {
      console.log('  ✓ Migrada a URL');
    }
  }
  
  console.log('\nMigración completada');
}

migrateBase64Images().catch(console.error);
