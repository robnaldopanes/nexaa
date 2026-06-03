import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function POST() {
  try {
    const supabase = getSupabase();
    const results: Record<string, number> = {};

    // Limpiar news_inbox (mantener últimos 100)
    const { data: inboxOld } = await supabase
      .from('news_inbox')
      .select('id')
      .order('created_at', { ascending: false })
      .range(100, 99999);

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

    // Limpiar user_submissions (mantener últimos 100)
    const { data: subsOld } = await supabase
      .from('user_submissions')
      .select('id')
      .order('created_at', { ascending: false })
      .range(100, 99999);

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

    // Limpiar social_shares (mantener últimos 100)
    const { data: sharesOld } = await supabase
      .from('social_shares')
      .select('id')
      .order('shared_at', { ascending: false })
      .range(100, 99999);

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

    // Limpiar ads (mantener últimos 10)
    const { data: adsOld } = await supabase
      .from('ads')
      .select('id')
      .order('created_at', { ascending: false })
      .range(10, 99999);

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

    return NextResponse.json({
      success: true,
      deleted: results,
      message: `Limpieza completada: ${Object.values(results).reduce((a, b) => a + b, 0)} registros eliminados`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
