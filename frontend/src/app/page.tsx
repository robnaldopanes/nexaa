import { supabaseServer } from '@/lib/supabase-server';
import { getApiUrl } from '@/lib/utils';
import { NewsItem, PhotoItem, AdSpace } from '@/lib/types';
import HomeClient from '@/components/home/HomeClient';

export const revalidate = 60;

async function withTimeout<T>(fn: () => Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchNational(): Promise<NewsItem | null> {
  return withTimeout(async () => {
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
  }, 3000, null);
}

async function fetchFeatured(): Promise<NewsItem[]> {
  return withTimeout(async () => {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('is_approved', true)
      .eq('is_featured', true)
      .order('published_at', { ascending: false });

    let list = data || [];

    if (list.length === 0) {
      try {
        const { data: breaking } = await supabaseServer
          .from('news')
          .select('*')
          .eq('is_published', true)
          .eq('is_approved', true)
          .eq('is_breaking', true)
          .order('published_at', { ascending: false });
        list = breaking || [];
      } catch {}
    }

    if (list.length === 0) {
      try {
        const { data: fallback } = await supabaseServer
          .from('news')
          .select('*')
          .eq('is_published', true)
          .eq('is_approved', true)
          .order('published_at', { ascending: false })
          .limit(5);
        list = fallback || [];
      } catch {}
    }

    return list.slice(0, 5);
  }, 5000, []);
}

async function fetchLatest(): Promise<NewsItem[]> {
  return withTimeout(async () => {
    const { data } = await supabaseServer
      .from('news')
      .select('*')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .limit(20);
    return data || [];
  }, 3000, []);
}

async function fetchPhotos(): Promise<PhotoItem[]> {
  return withTimeout(async () => {
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
  }, 3000, []);
}

async function fetchAds(): Promise<AdSpace[]> {
  return withTimeout(async () => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/ads?active=true`, { next: { revalidate: 60 } });
    if (!res.ok) return [];

    let activeAds = await res.json();

    if (!activeAds || activeAds.length === 0) {
      try {
        const resSeed = await fetch(`${apiUrl}/api/ads/seed`);
        if (resSeed.ok) {
          const seedResult = await resSeed.json();
          if (seedResult.success) {
            const resReload = await fetch(`${apiUrl}/api/ads?active=true`);
            if (resReload.ok) activeAds = await resReload.json();
          }
        }
      } catch {}
    }

    return activeAds || [];
  }, 3000, []);
}

export default async function HomePage() {
  const [national, featured, latest, photos, ads] = await Promise.all([
    fetchNational(),
    fetchFeatured(),
    fetchLatest(),
    fetchPhotos(),
    fetchAds(),
  ]);

  let featuredList = featured;
  if (national) {
    featuredList = featuredList.filter((item) => item.id !== national.id);
  }

  let latestList = latest;
  const featuredIds = new Set(featuredList.map((item) => item.id));
  if (featuredIds.size > 0) {
    latestList = latestList.filter((item) => !featuredIds.has(item.id));
  }
  if (national) {
    latestList = latestList.filter((item) => item.id !== national.id);
  }
  latestList = latestList.slice(0, 5);

  // Noticias adicionales para la sección "Más Noticias"
  const allFiltered = latest
    .filter((item) => {
      const featuredIds = new Set(featuredList.map((f) => f.id));
      return !featuredIds.has(item.id) && (!national || item.id !== national.id);
    });
  const moreNewsList = allFiltered.slice(5, 20);

  if (featuredList.length === 0 && latestList.length > 0) {
    featuredList = [latestList[0]];
    latestList = latestList.slice(1);
  }

  return (
    <HomeClient
      nationalFeatured={national}
      featuredNewsList={featuredList}
      latestNews={latestList}
      moreNews={moreNewsList}
      initialPhotos={photos}
      initialAds={ads}
    />
  );
}
