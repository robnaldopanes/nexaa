'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/utils';
import { NewsItem, AdSpace } from '@/lib/types';

interface DashboardStats {
  visitsToday: number;
  pendingAI: number;
  activeAds: number;
}

interface ModerationItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  image_url: string;
  category: string;
  status: string;
  detected_at: string;
}

export default function AdminDashboardPage() {
  const apiUrl = getApiUrl();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [activeNational, setActiveNational] = useState<NewsItem | null>(null);
  const [loadingNational, setLoadingNational] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ visitsToday: 0, pendingAI: 0, activeAds: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [loadingModeration, setLoadingModeration] = useState(true);

  const loadActiveNational = async () => {
    setLoadingNational(true);
    try {
      const res = await fetch(`${apiUrl}/api/news?comuna=Nacional&featured=true`);
      const { data } = await res.json();
      if (data && data.length > 0) {
        setActiveNational(data[0]);
      } else {
        setActiveNational(null);
      }
    } catch (e) {
      setActiveNational(null);
    }
    setLoadingNational(false);
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const [newsRes, rssRes, adsRes] = await Promise.all([
        fetch(`${apiUrl}/api/news/stats`).catch(() => null),
        fetch(`${apiUrl}/api/rss/counts`).catch(() => null),
        fetch(`${apiUrl}/api/ads?active=true`).catch(() => null),
      ]);

      let visitsToday = 0;
      let pendingAI = 0;
      let activeAds = 0;

      if (newsRes?.ok) {
        const newsData = await newsRes.json();
        visitsToday = newsData.totalViews || 0;
      }

      if (rssRes?.ok) {
        const rssData = await rssRes.json();
        pendingAI = rssData.pending || 0;
      }

      if (adsRes?.ok) {
        const adsData = await adsRes.json();
        activeAds = Array.isArray(adsData) ? adsData.filter((a: AdSpace) => a.is_active).length : 0;
      }

      setStats({ visitsToday, pendingAI, activeAds });
    } catch (e) {
      setStats({ visitsToday: 0, pendingAI: 0, activeAds: 0 });
    }
    setLoadingStats(false);
  };

  const loadModerationItems = async () => {
    setLoadingModeration(true);
    try {
      const res = await fetch(`${apiUrl}/api/rss?status=pending&limit=5`);
      const { data } = await res.json();
      setModerationItems(data || []);
    } catch (e) {
      setModerationItems([]);
    }
    setLoadingModeration(false);
  };

  const handleDemoteActiveNational = async () => {
    if (!activeNational) return;
    toast('¿Quitar esta noticia de la portada como Destacado Nacional?', {
      description: 'Volverá al inbox de RSS como noticia pendiente.',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            const res = await fetch(`${apiUrl}/api/rss/${activeNational.id}/demote-national`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Error al desmarcar');
            toast.success('Se ha removido el destacado nacional correctamente.');
            loadActiveNational();
          } catch (err) {
            console.error(err);
            toast.error('Error al desmarcar el destacado nacional.');
          }
        },
      },
    });
  };

  useEffect(() => {
    loadActiveNational();
    loadStats();
    loadModerationItems();
  }, []);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    }, 1500);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-stack-lg">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">
            Panel
          </p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Panel</h1>
        </div>
        <div className="flex gap-stack-sm">
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-gutter py-2 rounded-lg font-label-md text-label-md transition-all active:scale-95 ${
              synced
                ? 'bg-green-100 text-green-800 border-green-200 border'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${syncing ? 'animate-spin' : ''}`}>
              {synced ? 'done' : 'sync'}
            </span>
            {syncing ? 'Sincronizando...' : synced ? 'Sincronizado' : 'Sincronizar'}
          </button>
          <Link
            href="/admin/noticias"
            className="flex items-center gap-2 px-gutter py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Publicar
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-stack-lg">
        {[
          {
            label: 'Visitas Totales',
            value: loadingStats ? '...' : stats.visitsToday.toLocaleString('es-CL'),
            change: loadingStats ? '' : `${stats.visitsToday > 0 ? 'Datos reales' : 'Sin datos'}`,
            icon: 'visibility',
            color: 'text-secondary',
            bg: 'bg-secondary/10',
            chipBg: 'bg-secondary-fixed',
            chipColor: 'text-on-secondary-fixed-variant',
          },
          {
            label: 'IA Pendientes',
            value: loadingStats ? '...' : stats.pendingAI.toString(),
            change: loadingStats ? '' : (stats.pendingAI > 0 ? 'Urgente' : 'Al día'),
            icon: 'auto_awesome',
            color: 'text-on-tertiary-container',
            bg: 'bg-on-tertiary-container/10',
            chipBg: 'bg-tertiary-fixed',
            chipColor: 'text-on-tertiary-fixed-variant',
          },
          {
            label: 'Anuncios Activos',
            value: loadingStats ? '...' : stats.activeAds.toString().padStart(2, '0'),
            change: loadingStats ? '' : (stats.activeAds > 0 ? 'Estable' : 'Sin anuncios'),
            icon: 'campaign',
            color: 'text-on-primary-fixed-variant',
            bg: 'bg-on-primary-fixed-variant/10',
            chipBg: 'bg-surface-container-highest',
            chipColor: 'text-on-surface-variant',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm flex flex-col gap-2 group hover:border-secondary transition-colors duration-300"
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 ${stat.bg} rounded-lg ${stat.color}`}>
                <span
                  className={`material-symbols-outlined ${stat.icon === 'auto_awesome' ? 'material-symbols-filled' : ''}`}
                >
                  {stat.icon}
                </span>
              </div>
              <span className={`text-label-sm font-label-sm ${stat.chipColor} ${stat.chipBg} px-2 py-0.5 rounded-full`}>
                {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-on-surface-variant font-label-md text-label-md">{stat.label}</h3>
              <p className="text-display-lg font-display-lg text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Widget Noticia Destacada Nacional Activa */}
      <div className="mb-stack-lg bg-gradient-to-br from-amber-500/5 via-surface-container-lowest to-surface-container-lowest border border-amber-400/40 rounded-2xl p-6 shadow-md relative overflow-hidden group hover:border-amber-400/80 transition-all duration-300">
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/15 transition-all" />
        
        <div className="flex items-center justify-between gap-4 mb-4 border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-500 animate-pulse text-[28px] font-bold">
              workspace_premium
            </span>
            <div>
              <h2 className="text-body-lg font-bold text-primary tracking-wide">Noticia Destacada Nacional</h2>
              <p className="text-[11px] text-on-surface-variant font-medium">Esta noticia se muestra de manera fija y destacada en la portada principal del portal</p>
            </div>
          </div>
          {activeNational && (
            <span className="bg-amber-500/10 text-amber-800 border border-amber-500/25 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">public</span>
              En Portada
            </span>
          )}
        </div>

        {loadingNational ? (
          <div className="flex items-center gap-2 py-4">
            <span className="material-symbols-outlined animate-spin text-amber-500">progress_activity</span>
            <span className="text-body-md text-on-surface-variant">Consultando portada nacional...</span>
          </div>
        ) : activeNational ? (
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {activeNational.image_url && (
              <div className="w-full md:w-36 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/20 shadow-sm">
                <img src={activeNational.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-news.svg'; }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 bg-amber-400/10 text-amber-900 border border-amber-400/20 text-label-sm font-semibold rounded-full">
                  {activeNational.category || 'Nacional'}
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  {new Date(activeNational.published_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-label-sm text-on-surface-variant/60">·</span>
                <span className="text-label-sm text-on-surface-variant/80 font-medium flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">source</span>
                  {activeNational.source_name}
                </span>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface mb-2 leading-snug">
                {activeNational.title}
              </h3>
              {activeNational.summary && (
                <p className="text-body-md text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                  {activeNational.summary}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleDemoteActiveNational}
                  className="px-4 py-2 bg-error/10 hover:bg-error/15 text-error border border-error/20 rounded-xl text-label-md font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Desmarcar Destacado
                </button>
                <a
                  href={`/noticia/${activeNational.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-xl text-label-md font-bold text-on-surface transition-all flex items-center gap-1.5 active:scale-95 hover:no-underline"
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  Ver en Portada Pública
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 px-4 bg-surface-container-low/40 rounded-xl border border-dashed border-amber-400/20 flex flex-col sm:flex-row items-center gap-4">
            <span className="material-symbols-outlined text-amber-500/60 text-[40px]">
              hotel_class
            </span>
            <div className="text-center sm:text-left flex-1">
              <h4 className="text-body-md font-bold text-on-surface">No hay destacado nacional activo</h4>
              <p className="text-label-md text-on-surface-variant mt-0.5">
                Para destacar una noticia a nivel nacional en la portada principal, ve al <Link href="/admin/inbox" className="text-primary font-bold hover:underline">Inbox de Noticias</Link> y aprueba cualquier noticia de relevancia nacional presionando <strong className="text-primary font-bold">"Aprobar Nacional"</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Moderación IA */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
        <div className="px-gutter py-4 border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-surface-container-low/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined material-symbols-filled text-secondary">
              auto_awesome
            </span>
            <h2 className="text-headline-md font-headline-md text-primary">Moderación IA</h2>
            <span className="text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
              Filtro Inteligente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar fuente..."
                className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-full text-label-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left bg-surface-container-low/30 border-b border-outline-variant/30">
                <th className="px-gutter py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Fuente Original
                </th>
                <th className="px-gutter py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                  Resumen IA
                </th>
                <th className="px-gutter py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-gutter py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-gutter py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loadingModeration ? (
                <tr>
                  <td colSpan={5} className="px-gutter py-8 text-center">
                    <span className="material-symbols-outlined animate-spin text-secondary text-[24px]">progress_activity</span>
                    <p className="text-body-md text-on-surface-variant mt-2">Cargando items de moderación...</p>
                  </td>
                </tr>
              ) : moderationItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-gutter py-8 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-[36px]">check_circle</span>
                    <p className="text-body-md text-on-surface-variant mt-2">No hay items pendientes de moderación</p>
                  </td>
                </tr>
              ) : (
                moderationItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-gutter py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center text-primary font-bold overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.source || ''} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">article</span>
                          )}
                        </div>
                        <div>
                          <p className="text-label-md font-label-md text-primary">{item.source || 'Fuente desconocida'}</p>
                          <p className="text-label-sm text-on-surface-variant">{item.detected_at ? new Date(item.detected_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-gutter py-4 hidden md:table-cell">
                      <div className="max-w-xs">
                        <p className="text-body-md text-on-surface-variant line-clamp-2 italic">{item.title || item.summary || 'Sin resumen'}</p>
                      </div>
                    </td>
                    <td className="px-gutter py-4">
                      <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm rounded-full">
                        {item.category || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-gutter py-4">
                      <div className="flex items-center gap-2 font-label-md text-on-tertiary-container">
                        <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                        Pendiente
                      </div>
                    </td>
                    <td className="px-gutter py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await fetch(`${apiUrl}/api/rss/${item.id}/approve`, { method: 'POST' });
                              loadModerationItems();
                              loadStats();
                            } catch (e) {}
                          }}
                          className="p-2 bg-secondary text-on-secondary rounded-lg hover:bg-secondary/90 transition-all active:scale-90" 
                          aria-label="Aprobar noticia"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await fetch(`${apiUrl}/api/rss/${item.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'ignored' }),
                              });
                              loadModerationItems();
                              loadStats();
                            } catch (e) {}
                          }}
                          className="p-2 bg-error text-on-error rounded-lg hover:bg-error/90 transition-all active:scale-90" 
                          aria-label="Rechazar noticia"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                        <Link
                          href="/admin/inbox"
                          className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-all"
                          aria-label="Ver en inbox"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-gutter py-4 border-t border-outline-variant/30 bg-surface-container-low/20 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-label-sm text-on-surface-variant">
            {loadingModeration ? 'Cargando...' : `Mostrando ${moderationItems.length} de ${stats.pendingAI} pendientes`}
          </span>
          <Link href="/admin/inbox" className="text-label-sm text-primary hover:underline">
            Ver todos en Inbox →
          </Link>
        </div>
      </div>

      {/* Secondary section */}
      <div className="mt-stack-lg grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Traffic */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm h-64 flex flex-col">
          <div className="flex justify-between items-center mb-stack-md">
            <h3 className="text-label-md font-label-md text-primary">Fuentes de Tráfico</h3>
            <span className="material-symbols-outlined text-on-surface-variant" aria-label="Información de fuentes de tráfico">info</span>
          </div>
          <div className="flex-1 flex items-end gap-3 justify-center pb-4">
            <div className="w-8 bg-secondary-fixed-dim rounded-t-sm h-[60%]" title="Redes sociales" />
            <div className="w-8 bg-secondary rounded-t-sm h-[90%]" title="Directo" />
            <div className="w-8 bg-primary-container rounded-t-sm h-[40%]" title="Búsqueda" />
            <div className="w-8 bg-outline-variant rounded-t-sm h-[20%]" title="Otros" />
            <div className="w-8 bg-secondary-container rounded-t-sm h-[75%]" title="Referidos" />
          </div>
          <div className="flex justify-center gap-4 text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant pt-2 border-t border-outline-variant/10">
            <span>Directo</span>            <span>Redes sociales</span><span>Búsqueda</span>
          </div>
        </div>

        {/* System update */}
        <div className="bg-primary-container text-on-primary-container rounded-xl p-gutter shadow-sm h-64 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <span className="material-symbols-outlined material-symbols-filled text-[200px]">
              auto_awesome
            </span>
          </div>
          <div>
            <span className="bg-on-tertiary-container/20 text-on-tertiary-container text-label-sm font-label-sm px-3 py-1 rounded-full inline-block mb-2">
              Nueva Actualización
            </span>
            <h3 className="text-headline-md font-headline-md text-on-primary">
              Resúmenes IA un 40% más rápidos
            </h3>
            <p className="text-body-md text-on-primary-container/80 mt-2 max-w-xs">
              El nuevo motor NEXAA optimiza la detección de dialectos regionales en fuentes de Ñuble.
            </p>
          </div>
          <button className="w-fit px-gutter py-2 bg-surface-container-lowest text-primary rounded-lg font-label-md text-label-md hover:bg-white transition-all active:scale-95 z-10">
            Ver notas de versión
          </button>
        </div>
      </div>
    </div>
  );
}
