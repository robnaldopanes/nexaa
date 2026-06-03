import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const DAYS_TO_KEEP_NEWS = 90;
const DAYS_TO_KEEP_BREAKING = 7;
const DAYS_TO_KEEP_PHOTOS = 60;
const INBOX_LIMIT = 100;
const SUBS_LIMIT = 100;
const SHARES_LIMIT = 100;
const ADS_LIMIT = 10;

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function POST() {
  try {
    const supabase = getSupabase();
    const results: Record<string, number> = {};

    // 1) news_inbox: mantener últimos 100
    const { data: inboxOld } = await supabase
      .from('news_inbox')
      .select('id')
      .order('created_at', { ascending: false })
      .range(INBOX_LIMIT, 99999);

    if (inboxOld && inboxOld.length > 0) {
      const { error } = await supabase
        .from('news_inbox')
        .delete()
        .in('id', inboxOld.map(r => r.id));

      if (error) throw error;
      results.news_inbox = inboxOld.length;
    } else {
      results.news_inbox = 0;
    }

    // 2) user_submissions: mantener últimos 100
    const { data: subsOld } = await supabase
      .from('user_submissions')
      .select('id')
      .order('created_at', { ascending: false })
      .range(SUBS_LIMIT, 99999);

    if (subsOld && subsOld.length > 0) {
      const { error } = await supabase
        .from('user_submissions')
        .delete()
        .in('id', subsOld.map(r => r.id));

      if (error) throw error;
      results.user_submissions = subsOld.length;
    } else {
      results.user_submissions = 0;
    }

    // 3) social_shares: mantener últimos 100
    const { data: sharesOld } = await supabase
      .from('social_shares')
      .select('id')
      .order('shared_at', { ascending: false })
      .range(SHARES_LIMIT, 99999);

    if (sharesOld && sharesOld.length > 0) {
      const { error } = await supabase
        .from('social_shares')
        .delete()
        .in('id', sharesOld.map(r => r.id));

      if (error) throw error;
      results.social_shares = sharesOld.length;
    } else {
      results.social_shares = 0;
    }

    // 4) ads: mantener últimos 10
    const { data: adsOld } = await supabase
      .from('ads')
      .select('id')
      .order('created_at', { ascending: false })
      .range(ADS_LIMIT, 99999);

    if (adsOld && adsOld.length > 0) {
      const { error } = await supabase
        .from('ads')
        .delete()
        .in('id', adsOld.map(r => r.id));

      if (error) throw error;
      results.ads = adsOld.length;
    } else {
      results.ads = 0;
    }

    // 5) news breaking: borrar después de 7 días
    const { data: breakingOld, error: breakingError } = await supabase
      .from('news')
      .delete()
      .eq('is_breaking', true)
      .lt('published_at', dateDaysAgo(DAYS_TO_KEEP_BREAKING))
      .select('id');

    if (breakingError) throw breakingError;
    results.news_breaking = breakingOld?.length || 0;

    // 6) news antiguas: borrar después de 90 días
    const { data: newsOld, error: newsError } = await supabase
      .from('news')
      .delete()
      .eq('is_breaking', false)
      .lt('published_at', dateDaysAgo(DAYS_TO_KEEP_NEWS))
      .select('id');

    if (newsError) throw newsError;
    results.news_old = newsOld?.length || 0;

    // 7) photos: borrar después de 60 días
    const { data: photosOld, error: photosError } = await supabase
      .from('photos')
      .delete()
      .lt('created_at', dateDaysAgo(DAYS_TO_KEEP_PHOTOS))
      .select('id');

    if (photosError) throw photosError;
    results.photos = photosOld?.length || 0;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      deleted: results,
      message: `Limpieza completada: ${totalDeleted} registros eliminados`,
      config: {
        days_news: DAYS_TO_KEEP_NEWS,
        days_breaking: DAYS_TO_KEEP_BREAKING,
        days_photos: DAYS_TO_KEEP_PHOTOS,
        limits: {
          inbox: INBOX_LIMIT,
          submissions: SUBS_LIMIT,
          shares: SHARES_LIMIT,
          ads: ADS_LIMIT,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
