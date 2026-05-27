'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { getNewsImage, formatDate, cleanEllipsis, getApiUrl } from '@/lib/utils';
import { NewsItem, PhotoItem, AdSpace } from '@/lib/types';
import { setCachedHomeData, getCachedHomeData, isCacheStale } from '@/lib/newsCache';

interface HomeClientProps {
  nationalFeatured: NewsItem | null;
  featuredNewsList: NewsItem[];
  latestNews: NewsItem[];
  initialPhotos: PhotoItem[];
  initialAds: AdSpace[];
}

export default function HomeClient({
  nationalFeatured: initialNational,
  featuredNewsList: initialFeatured,
  latestNews: initialLatest,
  initialPhotos,
  initialAds,
}: HomeClientProps) {
  const router = useRouter();
  const [latestNews, setLatestNews] = useState<NewsItem[]>(initialLatest);
  const [featuredNewsList, setFeaturedNewsList] = useState<NewsItem[]>(initialFeatured);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [nationalFeatured, setNationalFeatured] = useState<NewsItem | null>(initialNational);
  const [aiSummaries, setAiSummaries] = useState<{ number: string; text: string }[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [ads, setAds] = useState<AdSpace[]>(initialAds);
  const apiUrl = getApiUrl();

  // Guardar datos del servidor en caché localStorage
  useEffect(() => {
    setCachedHomeData({
      nationalFeatured: initialNational,
      featuredNewsList: initialFeatured,
      latestNews: initialLatest,
      photos: initialPhotos,
      ads: initialAds,
    });
  }, [initialNational, initialFeatured, initialLatest, initialPhotos, initialAds]);

  // Cargar caché localStorage si los props del servidor están vacíos (fallback)
  useEffect(() => {
    if (initialFeatured.length > 0 || initialLatest.length > 0 || initialNational) return;

    const cached = getCachedHomeData();
    if (cached) {
      setNationalFeatured(cached.nationalFeatured);
      setFeaturedNewsList(cached.featuredNewsList);
      setLatestNews(cached.latestNews);
      setPhotos(cached.photos);
      setAds(cached.ads);
    }
  }, [initialFeatured, initialLatest, initialNational]);

  // Carousel rotación automática
  useEffect(() => {
    if (featuredNewsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % featuredNewsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredNewsList]);

  // AI Summary (client-side con caché localStorage)
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

      // Fallback: usar noticias locales
      const source = latestNews.length > 0 ? latestNews : initialLatest;
      if (source.length > 0) {
        setAiSummaries(source.slice(0, 3).map((item, index) => ({
          number: `0${index + 1}`,
          text: cleanEllipsis(item.summary) || item.title,
        })));
      }
    }

    fetchAISummary();
  }, [apiUrl, latestNews, initialLatest]);

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

  // Registrar impresiones de ads
  useEffect(() => {
    if (ads.length === 0) return;
    ads.forEach((ad) => {
      if (ad.is_active) {
        fetch(`${apiUrl}/api/ads/${ad.id}/impression`, { method: 'POST' }).catch(() => {});
      }
    });
  }, [ads, apiUrl]);

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
                  <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
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
                        <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
                        <span className="absolute top-1 right-1 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded-full">Ad</span>
                      </a>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="mt-stack-lg px-margin-mobile">
              <SectionHeader title="Miradas de Ñuble" viewAllLink="/fotos" />
              {ads.filter((a) => a.is_active && a.location === 'Barra lateral').slice(0, 1).map((ad) => (
                <div key={ad.id} className="mb-3">
                  <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-20 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                    <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
                  </a>
                </div>
              ))}
              {photos.length > 0 ? (
                <>
                  <PhotoGallery photos={photos.map(p => ({ id: p.id, image_url: p.image_url, alt: p.title, title: p.title, comuna: p.comuna }))} variant="grid" />
                  <button onClick={() => router.push('/fotos#subir')} className="w-full mt-3 py-2.5 border border-dashed border-outline-variant/60 rounded-xl text-on-surface-variant/60 hover:text-secondary hover:border-secondary/40 transition-all flex items-center justify-center gap-1.5 text-label-sm">
                    <span className="material-symbols-outlined text-[18px]">add_a_photo</span>Compartir una foto de Ñuble
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
          </>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
