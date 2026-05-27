import { supabaseServer } from '@/lib/supabase-server';
import { getApiUrl } from '@/lib/utils';
import { NewsItem, PhotoItem, AdSpace } from '@/lib/types';
import HomeClient from '@/components/home/HomeClient';

export const revalidate = 60;

async function fetchNational(): Promise<NewsItem | null> {
  try {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('is_approved', true)
      .eq('is_featured', true)
      .eq('comuna', 'Nacional')
      .order('published_at', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function fetchFeatured(): Promise<NewsItem[]> {
  try {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('is_approved', true)
      .eq('is_featured', true)
      .order('published_at', { ascending: false });

    let list = data || [];

    // Fallback: breaking news
    if (list.length === 0) {
      const { data: breaking } = await supabaseServer
        .from('news')
        .select('*')
        .eq('is_published', true)
        .eq('is_approved', true)
        .eq('is_breaking', true)
        .order('published_at', { ascending: false });
      list = breaking || [];
    }

    // Fallback: latest
    if (list.length === 0) {
      const { data: fallback } = await supabaseServer
        .from('news')
        .select('*')
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('published_at', { ascending: false })
        .limit(5);
      list = fallback || [];
    }

    return list.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchLatest(): Promise<NewsItem[]> {
  try {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .limit(12);
    return data || [];
  } catch {
    return [];
  }
}

async function fetchPhotos(): Promise<PhotoItem[]> {
  try {
    const { data } = await supabaseServer
      .from('photos')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(4);

    if (!data || data.length === 0) return [];

    return data.map((p) => ({
      id: p.id,
      title: p.title || 'Fotografía de Ñuble',
      description: p.description || '',
      image_url: p.image_url,
      photographer: p.photographer || 'Colaborador',
      comuna: p.comuna || 'Ñuble',
      category: p.category || 'General',
      likes: p.likes || 0,
      is_approved: p.is_approved ?? true,
      is_featured: p.is_featured ?? false,
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchAds(): Promise<AdSpace[]> {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/ads?active=true`, { next: { revalidate: 60 } });
    if (!res.ok) return [];

    let activeAds = await res.json();

    // Seed si no hay ads
    if (!activeAds || activeAds.length === 0) {
      const resSeed = await fetch(`${apiUrl}/api/ads/seed`);
      if (resSeed.ok) {
        const seedResult = await resSeed.json();
        if (seedResult.success) {
          const resReload = await fetch(`${apiUrl}/api/ads?active=true`);
          if (resReload.ok) activeAds = await resReload.json();
        }
      }
    }

    return activeAds || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [national, featured, latest, photos, ads] = await Promise.all([
    fetchNational(),
    fetchFeatured(),
    fetchLatest(),
    fetchPhotos(),
    fetchAds(),
  ]);

  // Filtrar featured para excluir national
  let featuredList = featured;
  if (national) {
    featuredList = featuredList.filter((item) => item.id !== national.id);
  }

  // Filtrar latest para excluir featured y national
  let latestList = latest;
  const featuredIds = new Set(featuredList.map((item) => item.id));
  if (featuredIds.size > 0) {
    latestList = latestList.filter((item) => !featuredIds.has(item.id));
  }
  if (national) {
    latestList = latestList.filter((item) => item.id !== national.id);
  }
  latestList = latestList.slice(0, 5);

  // Si no hay featured, usar el primero de latest
  if (featuredList.length === 0 && latestList.length > 0) {
    featuredList = [latestList[0]];
    latestList = latestList.slice(1);
  }

  return (
    <HomeClient
      nationalFeatured={national}
      featuredNewsList={featuredList}
      latestNews={latestList}
      initialPhotos={photos}
      initialAds={ads}
    />
  );
}
