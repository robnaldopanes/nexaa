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

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url: string;
  source_url: string;
  source_name: string;
  category: string;
  comuna: string;
  tags: string[];
  is_featured: boolean;
  is_breaking: boolean;
  is_approved: boolean;
  is_published: boolean;
  ai_generated: boolean;
  published_at: string;
  created_at: string;
  views: number;
  slug: string;
}

interface PhotoItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  photographer: string;
  comuna: string;
  category: string;
}

export default function HomePage() {
  const router = useRouter();
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [featuredNewsList, setFeaturedNewsList] = useState<NewsItem[]>([]);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [nationalFeatured, setNationalFeatured] = useState<NewsItem | null>(null);
  const [aiSummaries, setAiSummaries] = useState<{ number: string; text: string }[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = getApiUrl();

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
    if (featuredNewsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % featuredNewsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredNewsList]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const { data: nationalData } = await supabase.from('news').select('*')
          .eq('is_published', true).eq('is_approved', true).eq('is_featured', true)
          .eq('comuna', 'Nacional').order('published_at', { ascending: false }).limit(1);
        const mainNationalFeatured = nationalData && nationalData.length > 0 ? nationalData[0] : null;

        const { data: featuredData } = await supabase.from('news').select('*')
          .eq('is_published', true).eq('is_approved', true).eq('is_featured', true)
          .order('published_at', { ascending: false });

        let featuredList: NewsItem[] = featuredData || [];
        if (mainNationalFeatured) featuredList = featuredList.filter(item => item.id !== mainNationalFeatured.id);
        featuredList = featuredList.slice(0, 5);

        if (featuredList.length === 0) {
          const { data: breakingData } = await supabase.from('news').select('*')
            .eq('is_published', true).eq('is_approved', true).eq('is_breaking', true)
            .order('published_at', { ascending: false });
          featuredList = breakingData || [];
          if (mainNationalFeatured) featuredList = featuredList.filter(item => item.id !== mainNationalFeatured.id);
          featuredList = featuredList.slice(0, 5);
        }

        if (featuredList.length === 0) {
          const { data: fallback } = await supabase.from('news').select('*')
            .eq('is_published', true).eq('is_approved', true)
            .order('published_at', { ascending: false }).limit(5);
          featuredList = fallback || [];
          if (mainNationalFeatured) featuredList = featuredList.filter(item => item.id !== mainNationalFeatured.id);
        }

        const { data: latestData } = await supabase.from('news').select('*')
          .eq('is_published', true).eq('is_approved', true)
          .order('published_at', { ascending: false }).limit(12);

        let filteredLatest: NewsItem[] = latestData || [];
        if (featuredList.length > 0 && filteredLatest.length > 0) {
          const featuredIds = new Set(featuredList.map(item => item.id));
          filteredLatest = filteredLatest.filter(item => !featuredIds.has(item.id));
        }
        if (mainNationalFeatured && filteredLatest.length > 0) {
          filteredLatest = filteredLatest.filter(item => item.id !== mainNationalFeatured.id);
        }
        filteredLatest = filteredLatest.slice(0, 5);
        if (featuredList.length === 0 && filteredLatest.length > 0) {
          featuredList = [filteredLatest[0]];
          filteredLatest = filteredLatest.slice(1);
        }

        setFeaturedNewsList(featuredList);
        setNationalFeatured(mainNationalFeatured);
        setLatestNews(filteredLatest);

        // Resumen IA diario (cache 2 horas)
        const CACHE_KEY = 'nexaa_daily_summary';
        const cached = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
              setAiSummaries(parsed.items);
            }
          } catch {}
        }
        if (aiSummaries.length === 0) {
          try {
            const res = await fetch(`${apiUrl}/api/ai/daily-summary`, { method: 'POST' });
            if (res.ok) {
              const data = await res.json();
              if (data.items?.length > 0) {
                setAiSummaries(data.items);
                if (typeof window !== 'undefined') {
                  localStorage.setItem(CACHE_KEY, JSON.stringify({ items: data.items, timestamp: Date.now() }));
                }
              }
            }
          } catch {}
          // Fallback: usar noticias locales si el endpoint falló
          if (aiSummaries.length === 0 && latestData && latestData.length > 0) {
            setAiSummaries(latestData.slice(0, 3).map((item, index) => ({
              number: `0${index + 1}`,
              text: cleanEllipsis(item.summary) || item.title,
            })));
          }
        }

        const { data: photosData } = await supabase.from('photos').select('*')
          .eq('is_approved', true).order('created_at', { ascending: false }).limit(4);
        if (photosData && photosData.length > 0) {
          setPhotos(photosData.map((p: any) => ({
            id: p.id, title: p.title || 'Fotografía de Ñuble', description: p.description || '',
            image_url: p.image_url, photographer: p.photographer || 'Colaborador',
            comuna: p.comuna || 'Ñuble', category: p.category || 'General'
          })));
        }

        try {
          const resAds = await fetch(`${apiUrl}/api/ads?active=true`);
          if (resAds.ok) {
            let activeAds = await resAds.json();
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
            setAds(activeAds || []);
            activeAds.forEach((ad: any) => {
              fetch(`${apiUrl}/api/ads/${ad.id}/impression`, { method: 'POST' }).catch(() => {});
            });
          }
        } catch { setAds([]); }

      } catch (error) {
        console.error('Error al cargar datos de inicio:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

            {ads.filter((a: any) => a.is_active && a.location === 'Banner Principal').slice(0, 1).map((ad: any) => (
              <div key={ad.id} className="px-margin-mobile mt-stack-sm">
                <a href={ad.link_url || '#'} target={ad.link_url ? '_blank' : undefined} rel="nofollow" onClick={() => handleAdClick(ad.id)} className="block w-full h-24 rounded-xl overflow-hidden bg-surface-container-high hover:opacity-90 transition-opacity">
                  <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
                </a>
              </div>
            ))}

        {loading ? (
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
        ) : (
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
                  {idx === 1 && ads.filter((a: any) => a.is_active && a.location === 'Entre noticias').slice(0, 1).map((ad: any) => (
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
              {ads.filter((a: any) => a.is_active && a.location === 'Barra lateral').slice(0, 1).map((ad: any) => (
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
        )}
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
