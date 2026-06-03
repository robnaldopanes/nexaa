'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import SectionHeader from '@/components/ui/SectionHeader';
import CategoryChips from '@/components/news/CategoryChips';
import ReportajeHero from '@/components/news/ReportajeHero';
import NewsCard from '@/components/news/NewsCard';
import PhotoGallery from '@/components/news/PhotoGallery';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/utils';
import { NewsItem, PhotoItem, AdSpace } from '@/lib/types';
import { setCachedHomeData, getCachedHomeDataStale, isCacheStale, isCacheUsable } from '@/lib/newsCache';

export default function HomeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [moreNews, setMoreNews] = useState<NewsItem[]>([]);
  const [featuredNewsList, setFeaturedNewsList] = useState<NewsItem[]>([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [nationalFeatured, setNationalFeatured] = useState<NewsItem | null>(null);
  const [reportaje, setReportaje] = useState<NewsItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [ads, setAds] = useState<AdSpace[]>([]);
  const apiUrl = getApiUrl();
  const fetchInProgressRef = useRef(false);

  const loadFromCache = useCallback((): { loaded: boolean; needsRefresh: boolean } => {
    try {
      const cached = getCachedHomeDataStale();
      if (cached && isCacheUsable(cached)) {
        setNationalFeatured(cached.nationalFeatured);
        setFeaturedNewsList(cached.featuredNewsList || []);
        setLatestNews(cached.latestNews || []);
        setMoreNews(cached.moreNews || []);
        setPhotos(cached.photos || []);
        setAds(cached.ads || []);
        setReportaje(cached.reportaje || null);
        setLoading(false);
        setError(null);
        return { loaded: true, needsRefresh: isCacheStale(cached) };
      }
    } catch (e) {
      console.error('Error loading cache:', e);
    }
    return { loaded: false, needsRefresh: true };
  }, []);

  const fetchAndCache = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      const feedFields = 'id,title,summary,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,slug,views';

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        const cached = getCachedHomeDataStale();
        if (cached && isCacheUsable(cached)) {
          setNationalFeatured(cached.nationalFeatured);
          setFeaturedNewsList(cached.featuredNewsList || []);
          setLatestNews(cached.latestNews || []);
          setMoreNews(cached.moreNews || []);
          setPhotos(cached.photos || []);
          setAds(cached.ads || []);
          setReportaje(cached.reportaje || null);
          setLoading(false);
          setError(null);
          return;
        }
        setError('No se pudo conectar al servidor. Verifica tu conexión.');
        setLoading(false);
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 12000)
      );

      const dataPromise = Promise.all([
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).eq('comuna', 'Nacional').order('published_at', { ascending: false }).limit(1),
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_featured', true).order('published_at', { ascending: false }),
        supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).order('published_at', { ascending: false }).limit(20),
        supabase.from('photos').select('id,title,description,image_url,photographer,comuna,category,likes,is_approved,is_featured,created_at').eq('is_approved', true).order('created_at', { ascending: false }).limit(4),
        supabase.from('news').select('id,title,summary,image_url,category,comuna,published_at,source_name,slug').eq('is_published', true).eq('is_approved', true).eq('category', 'Reportajes').order('published_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const [nationalRes, featuredRes, latestRes, photosRes, reportajeRes] = await Promise.race([dataPromise, timeoutPromise]) as Awaited<typeof dataPromise>;

      const national = nationalRes.data && nationalRes.data.length > 0 ? nationalRes.data[0] as NewsItem : null;
      const reportajeData = reportajeRes.data ? reportajeRes.data as NewsItem : null;

      let featuredList = (featuredRes.data || []) as NewsItem[];
      if (national) featuredList = featuredList.filter((item) => item.id !== national.id);
      featuredList = featuredList.filter((item) => item.category !== 'Reportajes');

      if (featuredList.length === 0) {
        const { data: breaking } = await supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).eq('is_breaking', true).order('published_at', { ascending: false });
        featuredList = (breaking || []).filter((item) => item.category !== 'Reportajes') as NewsItem[];
        if (national) featuredList = featuredList.filter((item) => item.id !== national!.id);
      }
      if (featuredList.length === 0) {
        const { data: fallback } = await supabase.from('news').select(feedFields).eq('is_published', true).eq('is_approved', true).order('published_at', { ascending: false }).limit(5);
        featuredList = (fallback || []).filter((item) => item.category !== 'Reportajes') as NewsItem[];
        if (national) featuredList = featuredList.filter((item) => item.id !== national!.id);
      }
      featuredList = featuredList.slice(0, 5);

      let latestList = (latestRes.data || []) as NewsItem[];
      const featuredIds = new Set(featuredList.map((item) => item.id));
      if (featuredIds.size > 0) latestList = latestList.filter((item) => !featuredIds.has(item.id));
      if (national) latestList = latestList.filter((item) => item.id !== national.id);
      latestList = latestList.filter((item) => item.category !== 'Reportajes');
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

      setNationalFeatured(national);
      setFeaturedNewsList(featuredList);
      setLatestNews(latestSliced.length > 0 ? latestSliced : featuredList.slice(1));
      setMoreNews(moreNewsList);
      setPhotos(mappedPhotos);
      setReportaje(reportajeData);
      setError(null);

      setCachedHomeData({
        nationalFeatured: national,
        featuredNewsList: featuredList,
        latestNews: latestSliced.length > 0 ? latestSliced : featuredList.slice(1),
        moreNews: moreNewsList,
        photos: mappedPhotos,
        ads: [],
        reportaje: reportajeData,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching home data:', err);

      const cached = getCachedHomeDataStale();
      if (cached && isCacheUsable(cached) && latestNews.length === 0) {
        setNationalFeatured(cached.nationalFeatured);
        setFeaturedNewsList(cached.featuredNewsList || []);
        setLatestNews(cached.latestNews || []);
        setMoreNews(cached.moreNews || []);
        setPhotos(cached.photos || []);
        setAds(cached.ads || []);
        setReportaje(cached.reportaje || null);
        setError(null);
      } else {
        setError('No se pudieron cargar las noticias. Toca para reintentar.');
      }
      setLoading(false);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, []);

  const fetchAndCacheRef = useRef(fetchAndCache);
  useEffect(() => {
    fetchAndCacheRef.current = fetchAndCache;
  }, [fetchAndCache]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchAndCacheRef.current?.();
  }, []);

  useEffect(() => {
    const { loaded, needsRefresh } = loadFromCache();
    if (loaded && !needsRefresh) return;
    fetchAndCache();

    const safetyTimeout = setTimeout(() => {
      if (fetchInProgressRef.current) {
        console.warn('Safety timeout: forzando fin de loading');
        setLoading(false);
        setError('La carga está tardando demasiado. Toca para reintentar.');
        fetchInProgressRef.current = false;
      }
    }, 20000);

    return () => clearTimeout(safetyTimeout);
  }, [loadFromCache, fetchAndCache]);

  useEffect(() => {
    if (featuredNewsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % featuredNewsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredNewsList]);

  useEffect(() => {
    async function fetchAds() {
      try {
        const resAds = await fetch(`${apiUrl}/api/ads?active=true`);
        if (resAds.ok) {
          const adsData = await resAds.json();
          if (adsData && adsData.length > 0) {
            setAds(adsData);
          }
        }
      } catch {}
    }
    fetchAds();
  }, [apiUrl]);

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
            <div className="relative w-full aspect-[16/10] rounded-xl bg-surface-container-high animate-pulse overflow-hidden">
              <div className="absolute bottom-4 left-4 right-4 space-y-3">
                <div className="h-5 bg-surface-container-highest rounded w-3/4" />
                <div className="h-4 bg-surface-container-highest rounded w-1/2" />
              </div>
            </div>
            {error && (
              <div className="bg-error-container rounded-xl p-4 flex flex-col items-center gap-3 mt-4">
                <span className="material-symbols-outlined text-error text-[32px]">
                  cloud_off
                </span>
                <p className="text-on-error-container text-body-md text-center">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md font-bold active:scale-95"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
          <Footer />
        </main>
        <BottomNav />
      </>
    );
  }

  if (error && latestNews.length === 0 && featuredNewsList.length === 0) {
    return (
      <>
        <TopAppBar />
        <main className="pt-14 pb-20 overflow-x-hidden">
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin-mobile text-center">
            <span className="material-symbols-outlined text-error text-[64px] mb-3">
              cloud_off
            </span>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
              Sin conexión
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4 max-w-xs">
              {error || 'No se pudieron cargar las noticias. Verifica tu conexión a internet.'}
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-label-md font-label-md font-bold active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Reintentar
            </button>
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
        {error && (
          <div className="bg-error-container/90 backdrop-blur-sm px-margin-mobile py-2 mt-14 flex items-center justify-between gap-2 text-on-error-container text-label-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0">cloud_off</span>
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="text-primary font-bold text-label-sm flex-shrink-0 active:scale-95 px-2 py-0.5"
            >
              Reintentar
            </button>
          </div>
        )}
        <div className={error ? 'mt-stack-md' : 'mt-stack-md'}>
          <SearchBar placeholder="Buscar noticias en Chillán..." onSearch={handleSearchSubmit} />
        </div>
            <section className="mt-stack-md">
              <CategoryChips onSelect={handleCategorySubmit} />
            </section>

            {ads.filter((a) => a.is_active && a.location === 'Banner Principal').slice(0, 1).map((ad) => (
              <div key={ad.id} className="px-margin-mobile mt-stack-sm">
                <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-24 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                        <img src={ad.image_url} alt={ad.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
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
              {reportaje && <ReportajeHero reportaje={reportaje} />}
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
                  <img src={ad.image_url} alt={ad.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
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
                        <img src={ad.image_url} alt={ad.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
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
