'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import SectionHeader from '@/components/ui/SectionHeader';
import CategoryChips from '@/components/news/CategoryChips';
import AISummary from '@/components/news/AISummary';
import NewsCard from '@/components/news/NewsCard';
import PhotoGallery from '@/components/news/PhotoGallery';
import { supabase } from '@/lib/supabase';
import { cleanEllipsis, getApiUrl } from '@/lib/utils';
import { NewsItem, PhotoItem, AdSpace } from '@/lib/types';
import { setCachedHomeData, getCachedHomeData } from '@/lib/newsCache';

export default function HomeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [moreNews, setMoreNews] = useState<NewsItem[]>([]);
  const [featuredNewsList, setFeaturedNewsList] = useState<NewsItem[]>([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [nationalFeatured, setNationalFeatured] = useState<NewsItem | null>(null);
  const [aiSummaries, setAiSummaries] = useState<{ number: string; text: string }[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [ads, setAds] = useState<AdSpace[]>([]);
  const apiUrl = getApiUrl();

  const loadFromCache = useCallback(() => {
    const cached = getCachedHomeData();
    if (cached) {
      setNationalFeatured(cached.nationalFeatured);
      setFeaturedNewsList(cached.featuredNewsList);
      setLatestNews(cached.latestNews);
      setMoreNews(cached.moreNews || []);
      setPhotos(cached.photos);
      setAds(cached.ads);
      setLoading(false);
      return true;
    }
    return false;
  }, []);

  const fetchAndCache = useCallback(async () => {
    try {
      // Solo seleccionar campos necesarios para el feed (reduce tamaño de 650KB a ~50KB)
      const feedFields = 'id,title,summary,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,slug,views';

      const [nationalRes, featuredRes, latestRes, photosRes] = await Promise.all([
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).eq('comuna', 'Nacional').order('published_at', { ascending: false }).limit(1),
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).order('published_at', { ascending: false }),
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).order('published_at', { ascending: false }).limit(20),
        supabase.from('photos').select('id,title,description,image_url,photographer,comuna,category,likes,is_approved,is_featured,created_at').eq('is_approved', true).order('created_at', { ascending: false }).limit(4),
      ]);

      const national = nationalRes.data && nationalRes.data.length > 0 ? nationalRes.data[0] as NewsItem : null;

      let featuredList = (featuredRes.data || []) as NewsItem[];
      if (national) featuredList = featuredList.filter((item) => item.id !== national.id);

      if (featuredList.length === 0) {
        const { data: breaking } = await supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_breaking', true).order('published_at', { ascending: false });
        featuredList = (breaking || []) as NewsItem[];
        if (national) featuredList = featuredList.filter((item) => item.id !== national!.id);
      }
      if (featuredList.length === 0) {
        const { data: fallback } = await supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).order('published_at', { ascending: false }).limit(5);
        featuredList = (fallback || []) as NewsItem[];
        if (national) featuredList = featuredList.filter((item) => item.id !== national!.id);
      }
      featuredList = featuredList.slice(0, 5);

      let latestList = (latestRes.data || []) as NewsItem[];
      const featuredIds = new Set(featuredList.map((item) => item.id));
      if (featuredIds.size > 0) latestList = latestList.filter((item) => !featuredIds.has(item.id));
      if (national) latestList = latestList.filter((item) => item.id !== national.id);
      const latestSliced = latestList.slice(0, 5);

      const moreNewsList = latestList.filter((item) => !featuredIds.has(item.id) && (!national || item.id !== national.id)).slice(5, 20);

      if (featuredList.length === 0 && latestSliced.length > 0) {
        featuredList = [latestSliced[0]];
        latestList = latestSliced.slice(1);
      }

      const photosData = photosRes.data || [];
      const mappedPhotos: PhotoItem[] = photosData.map((p) => ({
        id: p.id, title: p.title || 'Fotografía de Ñuble', description: p.description || '',
        image_url: p.image_url, photographer: p.photographer || 'Colaborador',
        comuna: p.comuna || 'Ñuble', category: p.category || 'General',
        likes: p.likes || 0, is_approved: p.is_approved ?? true, is_featured: p.is_featured ?? false,
        created_at: p.created_at || new Date().toISOString(),
      }));

      let adsData: AdSpace[] = [];
      try {
        const resAds = await fetch(`${apiUrl}/api/ads?active=true`);
        if (resAds.ok) {
          adsData = await resAds.json();
          if (!adsData || adsData.length === 0) {
            const resSeed = await fetch(`${apiUrl}/api/ads/seed`);
            if (resSeed.ok) {
              const seedResult = await resSeed.json();
              if (seedResult.success) {
                const resReload = await fetch(`${apiUrl}/api/ads?active=true`);
                if (resReload.ok) adsData = await resReload.json();
              }
            }
          }
        }
      } catch {}

      setNationalFeatured(national);
      setFeaturedNewsList(featuredList);
      setLatestNews(latestSliced.length > 0 ? latestSliced : featuredList.slice(1));
      setMoreNews(moreNewsList);
      setPhotos(mappedPhotos);
      setAds(adsData || []);
      setLoading(false);

      setCachedHomeData({
        nationalFeatured: national,
        featuredNewsList: featuredList,
        latestNews: latestSliced.length > 0 ? latestSliced : featuredList.slice(1),
        moreNews: moreNewsList,
        photos: mappedPhotos,
        ads: adsData || [],
      });
    } catch (err) {
      console.error('Error fetching home data:', err);
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const hasCache = loadFromCache();
    if (hasCache) {
      fetchAndCache();
    } else {
      fetchAndCache();
    }
  }, [loadFromCache, fetchAndCache]);

  useEffect(() => {
    if (featuredNewsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % featuredNewsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredNewsList]);

  useEffect(() => {
    const CACHE_KEY = 'nexaa_daily_summary';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
          setAiSummaries(parsed.items);
          return;
        }
      } catch {}
    }

    async function fetchAISummary() {
      try {
        const res = await fetch(`${apiUrl}/api/ai/daily-summary`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length > 0) {
            setAiSummaries(data.items);
            if (typeof window !== 'undefined') {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ items: data.items, timestamp: Date.now() }));
            }
            return;
          }
        }
      } catch {}

      if (latestNews.length > 0) {
        setAiSummaries(latestNews.slice(0, 3).map((item, index) => ({
          number: `0${index + 1}`,
          text: cleanEllipsis(item.summary) || item.title,
        })));
      }
    }

    fetchAISummary();
  }, [apiUrl, latestNews]);

  const handleSearchSubmit = (q: string) => {
    if (q.trim()) { router.push(`/buscar?q=${encodeURIComponent(q.trim())}`); }
  };

  const handleCategorySubmit = (slug: string) => {
    if (slug) { router.push(`/buscar?category=${encodeURIComponent(slug)}`); }
    else { router.push('/buscar'); }
  };

  const handleAdClick = (adId: string) => {
    fetch(`${apiUrl}/api/ads/${adId}/click`, { method: 'POST' }).catch(() => {});
  };

  useEffect(() => {
    if (ads.length === 0) return;
    ads.forEach((ad) => {
      if (ad.is_active) {
        fetch(`${apiUrl}/api/ads/${ad.id}/impression`, { method: 'POST' }).catch(() => {});
      }
    });
  }, [ads, apiUrl]);

  if (loading) {
    return (
      <>
        <TopAppBar />
        <main className="pt-14 pb-20 overflow-x-hidden">
          <div className="px-margin-mobile mt-stack-lg space-y-4">
            <div className="ai-glow rounded-xl p-4 bg-surface-container-lowest shadow-sm animate-pulse flex items-center gap-2 h-12">
              <span className="material-symbols-outlined material-symbols-filled text-secondary/50 text-[20px]">auto_awesome</span>
              <div className="h-3 bg-surface-container-high rounded w-40" />
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-3 bg-surface-container-high rounded w-20" />
                    <div className="h-4 bg-surface-container-high rounded w-full" />
                    <div className="h-4 bg-surface-container-high rounded w-3/4" />
                    <div className="h-3 bg-surface-container-high rounded w-24" />
                  </div>
                  <div className="w-24 h-24 rounded-lg bg-surface-container-high flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
          <Footer />
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <div className="mt-stack-md">
          <SearchBar placeholder="Buscar noticias en Chillán..." onSearch={handleSearchSubmit} />
        </div>
            <section className="mt-stack-md">
              <CategoryChips onSelect={handleCategorySubmit} />
            </section>

            {ads.filter((a) => a.is_active && a.location === 'Banner Principal').slice(0, 1).map((ad) => (
              <div key={ad.id} className="px-margin-mobile mt-stack-sm">
                <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-24 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                  <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                </a>
              </div>
            ))}

          <>
            {featuredNewsList.length > 0 && (
              <section className="mt-stack-lg">
                <SectionHeader title="Noticias Destacadas" viewAllLink="/buscar" />
                <div className="px-margin-mobile">
                  <NewsCard news={featuredNewsList[activeFeaturedIndex]} variant="featured" />
                </div>
              </section>
            )}

            <section className="px-margin-mobile mt-stack-md">
              {aiSummaries.length > 0 && <AISummary items={aiSummaries} />}
            </section>

            {nationalFeatured && (
              <section className="mt-stack-md px-margin-mobile">
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                  Nacional
                </span>
                <NewsCard news={nationalFeatured} variant="horizontal" />
              </section>
            )}

            <section className="mt-stack-lg px-margin-mobile space-y-gutter">
              <h3 className="text-headline-md font-headline-md mb-2">Últimas Noticias</h3>
              {latestNews.map((news, idx) => (
                <div key={news.id}>
                  <NewsCard news={news} variant="horizontal" />
                  {idx === 1 && ads.filter((a) => a.is_active && a.location === 'Entre noticias').slice(0, 1).map((ad) => (
                    <div key={ad.id} className="mt-gutter">
                      <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-20 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                        <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                        <span className="absolute top-1 right-1 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded-full">Ad</span>
                      </a>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="mt-stack-lg px-margin-mobile">
              <SectionHeader title="Miradas de Ñuble" viewAllLink="/fotos" />
              {photos.length > 0 ? (
                <>
                  <PhotoGallery photos={photos.map(p => ({ id: p.id, image_url: p.image_url, alt: p.title, title: p.title, comuna: p.comuna }))} variant="grid" />
                  <button onClick={() => router.push('/fotos#subir')} className="w-full mt-3 py-3 bg-secondary text-on-secondary rounded-xl text-label-md font-label-md font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">add_a_photo</span>Compartir una foto de Ñuble
                  </button>
                </>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[48px]">photo_camera</span>
                  <p className="text-body-lg text-on-surface-variant mt-2">No hay fotografías publicadas</p>
                  <button onClick={() => router.push('/fotos#subir')} className="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity mt-3">Subir primera foto</button>
                </div>
              )}
            </section>

            {ads.filter((a) => a.is_active && a.location === 'Barra lateral').slice(0, 1).map((ad) => (
              <div key={ad.id} className="px-margin-mobile mt-stack-md">
                <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-20 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                  <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                </a>
              </div>
            ))}

            {moreNews.length > 0 && (
              <section className="mt-stack-lg px-margin-mobile space-y-gutter">
                <h3 className="text-headline-md font-headline-md mb-2">Más Noticias</h3>
                {moreNews.map((news) => (
                  <NewsCard key={news.id} news={news} variant="horizontal" />
                ))}
                <div className="pt-2">
                  <button onClick={() => router.push('/buscar')} className="w-full py-3 bg-surface-container-highest text-on-surface rounded-xl text-label-md font-label-md font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 uppercase tracking-wider">
                    Ver todas las noticias
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </section>
            )}

          </>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
