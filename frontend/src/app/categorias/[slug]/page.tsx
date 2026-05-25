'use client';

import { useState, useEffect } from 'react';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import NewsCard from '@/components/news/NewsCard';
import { CATEGORIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = CATEGORIES.find((c) => c.slug === params.slug);
  const name = category?.name || params.slug;

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryNews() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('is_published', true)
          .eq('is_approved', true)
          .eq('category', name)
          .order('published_at', { ascending: false });

        if (!error && data) {
          setNewsList(data);
        }
      } catch (err) {
        console.error('Error al cargar noticias de categoría:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryNews();
  }, [name]);

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <section className="px-margin-mobile mt-stack-md">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary text-[28px]">
              {category?.icon || 'newspaper'}
            </span>
            <h1 className="text-headline-lg-mobile font-headline-lg-mobile text-primary">{name}</h1>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Noticias de {name} en la Región de Ñuble
          </p>
        </section>

        <section className="px-margin-mobile space-y-gutter">
          {loading ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
              <p className="text-body-lg text-on-surface-variant mt-3">Cargando noticias de {name}...</p>
            </div>
          ) : newsList.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 text-center mt-4">
              <span className="material-symbols-outlined text-on-surface-variant text-[64px]">newspaper</span>
              <p className="text-body-lg text-on-surface-variant mt-3">No hay noticias en {name} aún</p>
              <p className="text-label-md text-on-surface-variant/60 mt-1">Las noticias sobre {name} aparecerán aquí una vez que sean aprobadas por el administrador.</p>
            </div>
          ) : (
            newsList.map((news) => (
              <NewsCard key={news.id} news={news} variant="horizontal" />
            ))
          )}
        </section>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
