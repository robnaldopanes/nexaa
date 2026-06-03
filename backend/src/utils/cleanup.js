const { supabase, HAS_VALID_CONFIG } = require('./supabase');

const DAYS_TO_KEEP_NEWS = 90;
const DAYS_TO_KEEP_BREAKING = 7;
const DAYS_TO_KEEP_PHOTOS = 60;
const INBOX_LIMIT = 100;
const SUBS_LIMIT = 100;
const SHARES_LIMIT = 100;
const ADS_LIMIT = 10;

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
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

  const total = Object.values(results).reduce((a, b) => a + (b || 0), 0);
  return { success: true, deleted: results, total };
}

module.exports = { runFullCleanup, DAYS_TO_KEEP_NEWS, DAYS_TO_KEEP_PHOTOS };
