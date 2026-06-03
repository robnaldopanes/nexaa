import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const BUCKET_NAME = 'news-images';

async function ensureBucket(supabase: ReturnType<typeof createClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
  }
}

async function migrateTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  folder: string
) {
  const { data: rows, error } = await supabase
    .from(tableName)
    .select('id, image_url')
    .like('image_url', 'data:image%');

  if (error || !rows || rows.length === 0) {
    return { table: tableName, total: 0, migrated: 0, errors: 0, results: [] };
  }

  const results: Array<{ id: string; status: string; error?: string; url?: string }> = [];

  for (const row of rows) {
    if (!row.image_url || !row.image_url.startsWith('data:image')) continue;

    const matches = row.image_url.match(/^data:image\/([^;]+);base64,(.+)$/);
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

    if (buffer.length > 5 * 1024 * 1024) {
      results.push({ id: row.id, status: 'error', error: 'Image too large' });
      continue;
    }

    const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueName, buffer, { contentType, upsert: false });

    if (uploadError) {
      results.push({ id: row.id, status: 'error', error: uploadError.message });
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueName);

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ image_url: urlData.publicUrl })
      .eq('id', row.id);

    if (updateError) {
      results.push({ id: row.id, status: 'error', error: updateError.message });
    } else {
      results.push({ id: row.id, status: 'ok', url: urlData.publicUrl });
    }
  }

  return {
    table: tableName,
    total: rows.length,
    migrated: results.filter(r => r.status === 'ok').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  };
}

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    await ensureBucket(supabase);

    const newsResult = await migrateTable(supabase, 'news', 'uploads');
    const adsResult = await migrateTable(supabase, 'ads', 'ads');
    const submissionsResult = await migrateTable(supabase, 'user_submissions', 'user-photos');
    const photosResult = await migrateTable(supabase, 'photos', 'photos');

    const allResults = [newsResult, adsResult, submissionsResult, photosResult];

    return NextResponse.json({
      summary: allResults.map(r => ({
        table: r.table,
        total: r.total,
        migrated: r.migrated,
        errors: r.errors,
      })),
      details: allResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
