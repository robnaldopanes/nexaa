const { supabase, HAS_VALID_CONFIG } = require('./supabase');

const DAYS_TO_KEEP_NEWS = 90;
const DAYS_TO_KEEP_BREAKING = 7;
const DAYS_TO_KEEP_PHOTOS = 60;
const DAYS_TO_KEEP_STORAGE_FILE = 30;
const INBOX_LIMIT = 100;
const SUBS_LIMIT = 100;
const SHARES_LIMIT = 100;
const ADS_LIMIT = 10;
const BUCKET_NAME = 'news-images';
const STORAGE_FOLDERS = ['uploads', 'ads', 'photos', 'user-photos'];

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function extractStoragePath(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

async function runFullCleanup() {
  if (!HAS_VALID_CONFIG || !supabase) {
    return { skipped: true, reason: 'Supabase no configurado' };
  }

  const results = {};

  try {
    const { data: inboxOld } = await supabase
      .from('news_inbox')
      .select('id')
      .order('created_at', { ascending: false })
      .range(INBOX_LIMIT, 99999);

    if (inboxOld && inboxOld.length > 0) {
      await supabase.from('news_inbox').delete().in('id', inboxOld.map(r => r.id));
      results.news_inbox = inboxOld.length;
    } else {
      results.news_inbox = 0;
    }
  } catch (e) {
    console.warn('[cleanup] news_inbox error:', e.message);
  }

  try {
    const { data: subsOld } = await supabase
      .from('user_submissions')
      .select('id')
      .order('created_at', { ascending: false })
      .range(SUBS_LIMIT, 99999);

    if (subsOld && subsOld.length > 0) {
      await supabase.from('user_submissions').delete().in('id', subsOld.map(r => r.id));
      results.user_submissions = subsOld.length;
    } else {
      results.user_submissions = 0;
    }
  } catch (e) {
    console.warn('[cleanup] user_submissions error:', e.message);
  }

  try {
    const { data: sharesOld } = await supabase
      .from('social_shares')
      .select('id')
      .order('shared_at', { ascending: false })
      .range(SHARES_LIMIT, 99999);

    if (sharesOld && sharesOld.length > 0) {
      await supabase.from('social_shares').delete().in('id', sharesOld.map(r => r.id));
      results.social_shares = sharesOld.length;
    } else {
      results.social_shares = 0;
    }
  } catch (e) {
    console.warn('[cleanup] social_shares error:', e.message);
  }

  try {
    const { data: adsOld } = await supabase
      .from('ads')
      .select('id')
      .order('created_at', { ascending: false })
      .range(ADS_LIMIT, 99999);

    if (adsOld && adsOld.length > 0) {
      await supabase.from('ads').delete().in('id', adsOld.map(r => r.id));
      results.ads = adsOld.length;
    } else {
      results.ads = 0;
    }
  } catch (e) {
    console.warn('[cleanup] ads error:', e.message);
  }

  try {
    const { data: breakingOld } = await supabase
      .from('news')
      .delete()
      .eq('is_breaking', true)
      .lt('published_at', dateDaysAgo(DAYS_TO_KEEP_BREAKING))
      .select('id');

    results.news_breaking = breakingOld?.length || 0;
  } catch (e) {
    console.warn('[cleanup] news_breaking error:', e.message);
  }

  try {
    const { data: newsOld } = await supabase
      .from('news')
      .delete()
      .eq('is_breaking', false)
      .lt('published_at', dateDaysAgo(DAYS_TO_KEEP_NEWS))
      .select('id');

    results.news_old = newsOld?.length || 0;
  } catch (e) {
    console.warn('[cleanup] news_old error:', e.message);
  }

  try {
    const { data: photosOld } = await supabase
      .from('photos')
      .delete()
      .lt('created_at', dateDaysAgo(DAYS_TO_KEEP_PHOTOS))
      .select('id');

    results.photos = photosOld?.length || 0;
  } catch (e) {
    console.warn('[cleanup] photos error:', e.message);
  }

  // Limpieza de Storage huérfano
  try {
    const storageResult = await cleanupOrphanStorage();
    results.storage_orphans = storageResult.deleted;
    results.storage_bytes_freed = storageResult.bytesFreed;
  } catch (e) {
    console.warn('[cleanup] storage error:', e.message);
    results.storage_orphans = 0;
  }

  const total = Object.entries(results).reduce((acc, [k, v]) => {
    if (k === 'storage_bytes_freed') return acc;
    return acc + (v || 0);
  }, 0);
  return { success: true, deleted: results, total };
}

async function cleanupOrphanStorage() {
  let deleted = 0;
  let bytesFreed = 0;

  const referencedPaths = new Set();

  try {
    const { data: newsRows } = await supabase
      .from('news')
      .select('image_url')
      .not('image_url', 'is', null);
    for (const r of newsRows || []) {
      const p = extractStoragePath(r.image_url);
      if (p) referencedPaths.add(p);
    }
  } catch (e) {
    console.warn('[cleanup] No se pudo leer news.image_url:', e.message);
  }

  try {
    const { data: photoRows } = await supabase
      .from('photos')
      .select('image_url')
      .not('image_url', 'is', null);
    for (const r of photoRows || []) {
      const p = extractStoragePath(r.image_url);
      if (p) referencedPaths.add(p);
    }
  } catch (e) {
    console.warn('[cleanup] No se pudo leer photos.image_url:', e.message);
  }

  try {
    const { data: adsRows } = await supabase
      .from('ads')
      .select('image_url')
      .not('image_url', 'is', null);
    for (const r of adsRows || []) {
      const p = extractStoragePath(r.image_url);
      if (p) referencedPaths.add(p);
    }
  } catch (e) {
    console.warn('[cleanup] No se pudo leer ads.image_url:', e.message);
  }

  try {
    const { data: subsRows } = await supabase
      .from('user_submissions')
      .select('image_url')
      .not('image_url', 'is', null);
    for (const r of subsRows || []) {
      const p = extractStoragePath(r.image_url);
      if (p) referencedPaths.add(p);
    }
  } catch (e) {
    console.warn('[cleanup] No se pudo leer user_submissions.image_url:', e.message);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_STORAGE_FILE);

  for (const folder of STORAGE_FOLDERS) {
    try {
      const allFiles = await listAllFiles(folder);
      const orphans = allFiles.filter((file) => {
        if (referencedPaths.has(file.name)) return false;
        if (!file.created_at) return false;
        return new Date(file.created_at) < cutoffDate;
      });

      if (orphans.length === 0) continue;

      const filePaths = orphans.map((f) => f.name);
      const { error: removeError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filePaths);

      if (removeError) {
        console.warn(`[cleanup] Error borrando archivos de ${folder}:`, removeError.message);
        continue;
      }

      deleted += orphans.length;
      bytesFreed += orphans.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
      console.log(`[cleanup] ${folder}: ${orphans.length} archivos huérfanos eliminados`);
    } catch (e) {
      console.warn(`[cleanup] Error procesando ${folder}:`, e.message);
    }
  }

  return { deleted, bytesFreed };
}

async function listAllFiles(folder) {
  const allFiles = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.warn(`[cleanup] Error listando ${folder}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.id === null || item.name === null) continue;
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      allFiles.push({
        name: fullPath,
        created_at: item.created_at,
        metadata: item.metadata,
      });
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

module.exports = { runFullCleanup, cleanupOrphanStorage, DAYS_TO_KEEP_NEWS, DAYS_TO_KEEP_PHOTOS };
