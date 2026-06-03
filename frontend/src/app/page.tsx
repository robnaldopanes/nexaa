import HomeClient from '@/components/home/HomeClient';
import { supabaseServer } from '@/lib/supabase-server';
import { getCachedHomeData, setCachedHomeData, isCacheStale } from '@/lib/newsCache';
import { NewsItem, PhotoItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchHomeDataSSR() {
  try {
    const feedFields = 'id,title,summary,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,slug,views';

    const [nationalRes, featuredRes, latestRes, photosRes, reportajeRes] = await Promise.all([
      supabaseServer.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).eq('comuna', 'Nacional').order('published_at', { ascending: false }).limit(1),
      supabaseServer.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).order('published_at', { ascending: false }),
      supabaseServer.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).order('published_at', { ascending: false }).limit(20),
      supabaseServer.from('photos').select('id,title,description,image_url,photographer,comuna,category,likes,is_approved,is_featured,created_at').eq('is_approved', true).order('created_at', { ascending: false }).limit(4),
      supabaseServer.from('news').select('id,title,summary,image_url,category,comuna,published_at,source_name,slug').eq('is_published', true).eq('is_approved', true).eq('category', 'Reportajes').order('published_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const national = nationalRes.data && nationalRes.data.length > 0 ? nationalRes.data[0] as NewsItem : null;
    const reportajeData = reportajeRes.data ? reportajeRes.data as NewsItem : null;

    let featuredList = (featuredRes.data || []) as NewsItem[];
    if (national) featuredList = featuredList.filter((item) => item.id !== national.id);
    featuredList = featuredList.filter((item) => item.category !== 'Reportajes');
    featuredList = featuredList.slice(0, 5);

    let latestList = (latestRes.data || []) as NewsItem[];
    const featuredIds = new Set(featuredList.map((item) => item.id));
    if (featuredIds.size > 0) latestList = latestList.filter((item) => !featuredIds.has(item.id));
    if (national) latestList = latestList.filter((item) => item.id !== national.id);
    latestList = latestList.filter((item) => item.category !== 'Reportajes');
    const latestSliced = latestList.slice(0, 5);

    const moreNewsList = latestList.filter((item) => !featuredIds.has(item.id) && (!national || item.id !== national.id)).slice(5, 20);

    const photosData = photosRes.data || [];
    const mappedPhotos: PhotoItem[] = photosData.map((p: any) => ({
      id: p.id, title: p.title || 'Fotografía de Ñuble', description: p.description || '',
      image_url: p.image_url, photographer: p.photographer || 'Colaborador',
      comuna: p.comuna || 'Ñuble', category: p.category || 'General',
      likes: p.likes || 0, is_approved: p.is_approved ?? true, is_featured: p.is_featured ?? false,
      created_at: p.created_at || new Date().toISOString(),
    }));

    return {
      nationalFeatured: national,
      featuredNewsList: featuredList,
      latestNews: latestSliced.length > 0 ? latestSliced : featuredList.slice(1),
      moreNews: moreNewsList,
      photos: mappedPhotos,
      ads: [],
      reportaje: reportajeData,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('[SSR] Error fetching home data:', err);
    return null;
  }
}

export default async function HomePage() {
  const ssrData = await fetchHomeDataSSR();
  return <HomeClient initialData={ssrData} />;
}
