'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StatData {
  totalNews: number;
  totalPhotos: number;
  totalViews: number;
  totalRssInbox: number;
  topNews: { id: string; title: string; views: number }[];
  categories: { name: string; count: number }[];
}

export default function AdminEstadisticasPage() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      // 1. Conteo de noticias publicadas (head: true no trae datos, solo count)
      const { count: newsCount } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_approved', true);

      // 2. Conteo de fotos
      const { count: photosCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);

      // 3. Top 5 más vistas (traer solo esos 5 y sumar sus vistas como aproximación)
      const { data: topNews } = await supabase
        .from('news')
        .select('id, title, views')
        .eq('is_published', true)
        .eq('is_approved', true)
        .order('views', { ascending: false })
        .limit(5);

      // 4. Conteo inbox
      const { count: inboxCount } = await supabase
        .from('news_inbox')
        .select('*', { count: 'exact', head: true });

      // 5. Suma total de vistas (traer solo el campo views, no todo el registro)
      const { data: viewsData } = await supabase
        .from('news')
        .select('views')
        .eq('is_published', true)
        .eq('is_approved', true);
      const totalViews = (viewsData || []).reduce((sum, n) => sum + (n.views || 0), 0);

      // 6. Categorías con conteo (traer solo category)
      const { data: catRaw } = await supabase
        .from('news')
        .select('category')
        .eq('is_published', true)
        .eq('is_approved', true);
      
      const catMap: Record<string, number> = {};
      (catRaw || []).forEach((n: any) => {
        const cat = n.category || 'Regional';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const categories = Object.entries(catMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setData({
        totalNews: newsCount || 0,
        totalPhotos: photosCount || 0,
        totalViews,
        totalRssInbox: inboxCount || 0,
        topNews: topNews || [],
        categories,
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
        <p className="text-body-lg text-on-surface-variant mt-3">Cargando estadísticas...</p>
      </div>
    );
  }

  const maxCat = Math.max(...(data?.categories.map(c => c.count) || [1]), 1);

  return (
    <div>
      <div className="flex justify-between items-end mb-stack-lg">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">Análisis</p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Estadísticas</h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-gutter mb-stack-lg">
        {[
          { label: 'Noticias publicadas', value: data?.totalNews.toLocaleString() || '0', icon: 'newspaper' },
          { label: 'Fotos en galería', value: data?.totalPhotos.toLocaleString() || '0', icon: 'collections' },
          { label: 'Visitas totales', value: data?.totalViews.toLocaleString() || '0', icon: 'visibility' },
          { label: 'Inbox RSS', value: data?.totalRssInbox.toLocaleString() || '0', icon: 'rss_feed' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm hover:border-secondary/40 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[24px] mb-2">{stat.icon}</span>
            <p className="text-display-lg font-display-lg text-primary">{stat.value}</p>
            <p className="text-label-sm text-on-surface-variant">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Top news + Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
        {/* Noticias más vistas */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50">
            <h2 className="text-headline-md font-headline-md text-primary">Más Vistas</h2>
          </div>
          {data?.topNews.length ? (
            <div className="divide-y divide-outline-variant/20">
              {data.topNews.map((n, i) => (
                <div key={n.id} className="px-gutter py-3 flex items-center gap-3">
                  <span className="text-display-lg font-display-lg text-on-surface-variant/20 w-8 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md text-primary truncate">{n.title}</p>
                  </div>
                  <span className="text-label-sm text-on-surface-variant flex-shrink-0">{n.views.toLocaleString()} vistas</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">visibility_off</span>
              <p className="text-body-md mt-2">Sin datos aún</p>
            </div>
          )}
        </div>

        {/* Categorías */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50">
            <h2 className="text-headline-md font-headline-md text-primary">Por Categoría</h2>
          </div>
          {data?.categories.length ? (
            <div className="p-gutter space-y-3">
              {data.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-label-sm mb-1">
                    <span className="text-on-surface-variant">{cat.name}</span>
                    <span className="text-primary font-bold">{cat.count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all duration-500"
                      style={{ width: `${(cat.count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">category</span>
              <p className="text-body-md mt-2">Sin datos aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
