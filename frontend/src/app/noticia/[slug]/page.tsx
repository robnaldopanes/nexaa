'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { getNewsImage, getCategoryIcon, cleanEllipsis } from '@/lib/utils';

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
  views: number;
  published_at: string;
  slug: string;
}

function timeAgo(dateStr: string) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  } catch {
    return 'Reciente';
  }
}

export default function NewsDetailPage({ params }: { params: { slug: string } }) {
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = news ? getNewsImage(news.image_url, news.category) : '';

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Obtener la noticia por slug
        const { data, error: fetchError } = await supabase
          .from('news')
          .select('*')
          .eq('slug', params.slug)
          .single();

        if (fetchError || !data) {
          setError('La noticia no existe o ha sido eliminada.');
          setLoading(false);
          return;
        }

        setNews(data);
        setLoading(false);

        // 2. Incrementar contador de visitas en segundo plano
        const newViews = (data.views || 0) + 1;
        await supabase
          .from('news')
          .update({ views: newViews })
          .eq('id', data.id);

      } catch (err) {
        console.error('Error al cargar la noticia:', err);
        setError('Ocurrió un error al cargar la noticia.');
        setLoading(false);
      }
    }

    loadNews();
  }, [params.slug]);

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        {loading ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
            <p className="text-body-lg text-on-surface-variant mt-3">Abriendo noticia...</p>
          </div>
        ) : error || !news ? (
          <div className="px-margin-mobile mt-stack-lg text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[64px]">drafts</span>
            <h1 className="text-headline-lg font-headline-lg text-primary mt-4">Noticia no encontrada</h1>
            <p className="text-body-md text-on-surface-variant mt-2 mb-6">{error || 'Esta noticia no está disponible.'}</p>
            <Link href="/" className="inline-block px-gutter py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <article className="px-margin-mobile mt-stack-md">
            {/* Categoría y Comuna */}
            <div className="flex items-center gap-2">
              <span className="text-secondary text-label-sm font-label-sm uppercase tracking-wider">
                {news.category}
              </span>
              {news.comuna && (
                <>
                  <span className="text-on-surface-variant/40 text-[12px]">•</span>
                  <span className="text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {news.comuna}
                  </span>
                </>
              )}
            </div>

            {/* Titular */}
            <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary mt-2 leading-tight">
              {news.title}
            </h1>

            {/* Metadatos */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-stack-sm text-label-sm text-on-surface-variant border-b border-outline-variant/20 pb-3">
              <span className="font-bold text-primary">{news.source_name || 'NEXAA'}</span>
              <span>·</span>
              <span>{timeAgo(news.published_at)}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                {news.views + 1} {news.views + 1 === 1 ? 'lectura' : 'lecturas'}
              </span>
            </div>

            {/* Imagen Principal */}
            {imageUrl ? (
              <div className="mt-stack-md aspect-video bg-surface-container-high rounded-xl overflow-hidden shadow-sm">
                <img src={imageUrl} alt={news.title} className="w-full h-full object-cover animate-fade-in" />
              </div>
            ) : (
              /* Banner de marca oscuro premium NEXAA */
              <div className="mt-stack-md aspect-video bg-gradient-to-br from-[#121216] to-[#1e1e26] rounded-xl flex flex-col justify-between p-6 border border-outline-variant/20 relative overflow-hidden shadow-sm select-none">
                <div className="absolute -right-10 -bottom-16 opacity-[0.03] text-[200px] font-bold select-none pointer-events-none">
                  NEXAA
                </div>
                <div className="flex justify-between items-center w-full z-10">
                  <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    NEXAA Regional
                  </span>
                  <span className="text-on-surface-variant text-[12px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">{getCategoryIcon(news.category)}</span>
                    {news.category}
                  </span>
                </div>
                <div className="z-10 mt-auto">
                  <span className="material-symbols-outlined text-secondary/40 text-[56px] mb-3">
                    {getCategoryIcon(news.category)}
                  </span>
                  <p className="text-on-surface-variant/80 text-body-lg italic pr-8 max-w-lg leading-relaxed">
                    "Esta noticia se encuentra en desarrollo en los portales regionales de la Provincia de Ñuble."
                  </p>
                </div>
              </div>
            )}

            {/* Resumen */}
            {news.summary && (
              <div className="mt-stack-md p-4 bg-surface-container-low border-l-4 border-secondary rounded-r-xl italic text-body-lg text-on-surface-variant">
                "{cleanEllipsis(news.summary)}"
              </div>
            )}

            {/* Contenido Completo */}
            <div className="mt-stack-md space-y-4 text-body-lg text-on-surface leading-relaxed">
              {(cleanEllipsis(news.content) || '').split('\n').filter(p => p.trim() !== '').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Etiquetas SEO */}
            {news.tags && news.tags.length > 0 && (
              <div className="mt-stack-md flex flex-wrap gap-2">
                {news.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-label-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Enlace original */}
            {news.source_url && (
              <div className="mt-stack-lg p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">link</span>
                  <span className="text-label-sm font-label-sm text-on-surface-variant">Fuente original de la noticia</span>
                </div>
                <a href={news.source_url} target="_blank" rel="noopener noreferrer" className="text-secondary text-label-md font-label-md hover:underline break-all inline-flex items-center gap-1 active:scale-95 transition-all">
                  Leer noticia completa en {news.source_name || 'fuente original'} 
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              </div>
            )}
          </article>
        )}

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
