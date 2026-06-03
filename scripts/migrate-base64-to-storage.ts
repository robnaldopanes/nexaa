import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);
const BUCKET_NAME = 'news-images';

async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }
    return true;
  } catch {
    return false;
  }
}

async function uploadBase64(base64String: string, folder: string): Promise<string | null> {
  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  if (buffer.length > 5 * 1024 * 1024) return null;

  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueName, buffer, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueName);
  return urlData.publicUrl;
}

async function migrateTable(tableName: string, folder: string) {
  console.log(`\nMigrando ${tableName}...`);

  const { data: rows, error } = await supabase
    .from(tableName)
    .select('id, image_url')
    .like('image_url', 'data:image%');

  if (error) {
    console.error(`Error consultando ${tableName}:`, error);
    return;
  }

  console.log(`Encontrados ${rows?.length || 0} registros con base64 en ${tableName}`);

  if (!rows || rows.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.image_url || !row.image_url.startsWith('data:image')) continue;

    const newUrl = await uploadBase64(row.image_url, folder);

    if (newUrl) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ image_url: newUrl })
        .eq('id', row.id);

      if (updateError) {
        console.error(`Error actualizando ${tableName} ${row.id}:`, updateError);
        failed++;
      } else {
        success++;
        process.stdout.write('.');
      }
    } else {
      failed++;
    }
  }

  console.log(`\n${tableName}: ${success} migrados, ${failed} fallidos`);
}

async function main() {
  console.log('=== Migración de imágenes base64 a Supabase Storage ===\n');

  const bucketReady = await ensureBucket();
  if (!bucketReady) {
    console.error('No se pudo preparar el bucket de Storage');
    return;
  }

  await migrateTable('ads', 'ads');
  await migrateTable('user_submissions', 'user-photos');
  await migrateTable('news', 'news');
  await migrateTable('photos', 'photos');

  console.log('\n=== Migración completada ===');
}

main().catch(console.error);
