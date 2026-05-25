'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import CategoryChips from '@/components/news/CategoryChips';
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

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Synchronize state and trigger search when URL search params change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const catParam = searchParams.get('category') || '';
    
    setQuery(q);
    setActiveCategory(catParam);

    if (q || catParam) {
      setSearched(true);
      handleSearch(q, catParam);
    } else {
      // Mostrar últimas noticias por defecto
      loadLatestNews();
    }
  }, [searchParams]);

  const loadLatestNews = async () => {
    try {
      setLoading(true);
      setSearched(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('published_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setNewsList(data);
      }
    } catch {
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchTerm: string, catSlug: string) => {
    try {
      setLoading(true);
      
      let dbQuery = supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('published_at', { ascending: false });

      if (searchTerm.trim()) {
        dbQuery = dbQuery.or(`title.ilike.%${searchTerm.trim()}%,content.ilike.%${searchTerm.trim()}%`);
      }

      if (catSlug) {
        const cat = CATEGORIES.find(c => c.slug === catSlug);
        if (cat) {
          dbQuery = dbQuery.eq('category', cat.name);
        }
      }

      const { data, error } = await dbQuery.limit(30);

      if (!error && data) {
        setNewsList(data);
      } else {
        setNewsList([]);
      }
    } catch (err) {
      console.error('Error al realizar búsqueda:', err);
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize category select with the URL query params
  const handleCategorySelect = (slug: string) => {
    const params = new URLSearchParams(window.location.search);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/buscar?${params.toString()}`);
  };

  // Synchronize search query submit with the URL query params
  const handleSearchSubmit = (q: string) => {
    const params = new URLSearchParams(window.location.search);
    if (q.trim()) {
      params.set('q', q.trim());
    } else {
      params.delete('q');
    }
    router.push(`/buscar?${params.toString()}`);
  };

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        <section className="mt-stack-md">
          <SearchBar 
            placeholder="Buscar noticias, comunas, categorías..." 
            onSearch={handleSearchSubmit}
          />
        </section>

        <section className="mt-stack-md">
          <CategoryChips 
            active={activeCategory} 
            onSelect={handleCategorySelect}
          />
        </section>

        {query && (
          <section className="px-margin-mobile mt-3 animate-fade-in">
            <p className="text-label-md text-on-surface-variant">
              Resultados para: <span className="font-bold text-primary">"{query}"</span>
            </p>
          </section>
        )}

        <section className="mt-stack-lg px-margin-mobile">
          {loading ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
              <p className="text-body-lg text-on-surface-variant mt-3 font-medium">Buscando noticias...</p>
            </div>
          ) : !searched ? (
            /* Pantalla inicial con sugerencias */
            <div className="animate-fade-in">
              <h3 className="text-headline-md font-headline-md mb-4">Búsquedas frecuentes</h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {[
                  'Hospital', 'Incendio', 'Fútbol', 'Lluvias',
                  'Pavimentación', 'Subsidios', 'Salud', 'Turismo',
                  'Elecciones',
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearchSubmit(term)}
                    className="px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-label-md hover:bg-surface-container-high hover:border-secondary transition-colors active:scale-95"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px]">search</span>
                <p className="text-body-lg text-on-surface-variant mt-2 font-semibold">Escribe para buscar noticias</p>
                <p className="text-label-md text-on-surface-variant/60 mt-1">Puedes buscar noticias locales en toda la región de Ñuble.</p>
              </div>
            </div>
          ) : newsList.length === 0 ? (
            /* Estado vacío */
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 text-center animate-fade-in">
              <span className="material-symbols-outlined text-on-surface-variant text-[64px]">search_off</span>
              <p className="text-body-lg text-on-surface-variant mt-3 font-semibold">No encontramos resultados</p>
              <p className="text-label-md text-on-surface-variant/60 mt-1">Prueba con otros términos o cambia la categoría seleccionada.</p>
            </div>
          ) : (
            /* Lista de Resultados */
            <div className="space-y-gutter animate-fade-in">
              <h3 className="text-headline-md font-headline-md mb-4">
                Noticias Encontradas ({newsList.length})
              </h3>
              <div className="space-y-gutter">
                {newsList.map((news) => (
                  <NewsCard key={news.id} news={news} variant="horizontal" />
                ))}
              </div>
            </div>
          )}
        </section>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-16">
        <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
        <p className="text-body-lg text-on-surface-variant mt-3">Cargando buscador...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
