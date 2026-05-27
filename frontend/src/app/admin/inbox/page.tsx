'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES, COMUNAS } from '@/lib/constants';
import { getApiUrl } from '@/lib/utils';
import { NewsItem, InboxItem } from '@/lib/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  ignored: { label: 'Ignorado', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publicado', color: 'bg-blue-100 text-blue-800' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export default function InboxPage() {
  const apiUrl = getApiUrl();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [fetching, setFetching] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, ignored: 0, total: 0 });
  const [activeNational, setActiveNational] = useState<NewsItem | null>(null);
  const [loadingNational, setLoadingNational] = useState(true);

  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editComuna, setEditComuna] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const openEditModal = (item: InboxItem) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditSummary(item.summary || '');
    setEditCategory(item.category || '');
    setEditComuna(item.comuna || '');
    setEditImageUrl(item.image_url || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${apiUrl}/api/rss/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          summary: editSummary.trim(),
          category: editCategory,
          comuna: editComuna,
          image_url: editImageUrl.trim(),
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');
      
      setEditingItem(null);
      alert('Cambios guardados con éxito en la noticia.');
      loadItems();
      loadCounts();
    } catch (err) {
      alert('Ocurrió un error al guardar los cambios de la noticia.');
    }
  };

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
    } catch {
      setActiveNational(null);
    }
    setLoadingNational(false);
  };

  const handleDemoteActiveNational = async () => {
    if (!activeNational) return;
    const confirmDemote = window.confirm('¿Estás seguro de que deseas quitar esta noticia de la portada como Destacado Nacional? Volverá al inbox de RSS como noticia pendiente.');
    if (!confirmDemote) return;

    try {
      // 1. Encontrar el inbox item correspondiente
      const resInbox = await fetch(`${apiUrl}/api/rss/by-published/${activeNational.id}`);
      const inboxItem = await resInbox.json();

      if (inboxItem && inboxItem.id) {
        // 2. Si existe en el inbox, hacemos el PUT para pasarlo a 'pending' (lo que desvincula y borra la noticia)
        await fetch(`${apiUrl}/api/rss/${inboxItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        });
      } else {
        // 3. Fallback si se subió manualmente: eliminarla de la tabla 'news'
        await fetch(`${apiUrl}/api/news/${activeNational.id}`, {
          method: 'DELETE',
        });
      }
      
      alert('Se ha removido el destacado nacional correctamente.');
      loadItems();
      loadCounts();
      loadActiveNational();
    } catch (err) {
      alert('Error al desmarcar el destacado nacional.');
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const url = `${apiUrl}/api/rss?status=${filter}&limit=50`;
      const res = await fetch(url);
      const { data } = await res.json();
      setItems(data || []);
    } catch { setItems([]); }
    setLoading(false);
  };

  const loadCounts = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/rss/counts`);
      const data = await res.json();
      setCounts(data);
    } catch {}
  };

  useEffect(() => { 
    loadItems(); 
    loadCounts(); 
    loadActiveNational();
  }, [filter]);

  const handleFetchNow = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${apiUrl}/api/rss/fetch`, { method: 'POST' });
      const data = await res.json();
      alert(`${data.message}`);
      loadItems();
      loadCounts();
      loadActiveNational();
    } catch { alert('Error al buscar noticias'); }
    setFetching(false);
  };

  const handleAction = async (id: string, action: string, isNational: boolean = false) => {
    try {
      if (action === 'approve') {
        await fetch(`${apiUrl}/api/rss/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_national: isNational }),
        });
      } else {
        await fetch(`${apiUrl}/api/rss/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action }),
        });
      }
      loadItems();
      loadCounts();
      loadActiveNational();
    } catch { alert('Error al procesar'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-stack-lg">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">
            Automatización RSS
          </p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Inbox de Noticias</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Noticias detectadas automáticamente desde fuentes RSS y Google News
          </p>
        </div>
        <button
          onClick={handleFetchNow}
          disabled={fetching}
          className="flex items-center gap-2 px-gutter py-2 bg-secondary text-on-secondary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[20px] ${fetching ? 'animate-spin' : ''}`}>
            {fetching ? 'progress_activity' : 'rss_feed'}
          </span>
          {fetching ? 'Buscando...' : 'Buscar ahora'}
        </button>
      </div>

      {/* Widget Noticia Destacada Nacional Activa */}
      <div className="mb-stack-lg bg-gradient-to-br from-amber-500/5 via-surface-container-lowest to-surface-container-lowest border border-amber-400/40 rounded-2xl p-6 shadow-md relative overflow-hidden group hover:border-amber-400/80 transition-all duration-300">
        {/* Background glow decorator */}
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
                Para destacar una noticia a nivel nacional en la portada principal, busca una noticia relevante en el listado de pendientes de abajo y presiona <strong className="text-primary font-bold">"Aprobar Nacional"</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-2 mb-stack-md overflow-x-auto no-scrollbar">
        {[
          { key: 'pending', label: `Pendientes (${counts.pending})`, icon: 'pending' },
          { key: 'approved', label: `Aprobados (${counts.approved})`, icon: 'check_circle' },
          { key: 'ignored', label: `Ignorados (${counts.ignored})`, icon: 'do_not_disturb_on' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-label-md font-label-md transition-colors flex items-center gap-1 ${
              filter === tab.key ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de noticias */}
      {loading ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
          <p className="text-body-lg text-on-surface-variant mt-3">Cargando inbox...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[64px]">inbox</span>
          <p className="text-body-lg text-on-surface-variant mt-3">
            {filter === 'pending' ? 'No hay noticias pendientes' : `No hay noticias ${filter === 'approved' ? 'aprobadas' : 'ignoradas'}`}
          </p>
          <p className="text-label-md text-on-surface-variant/60 mt-1">
            {filter === 'pending' ? 'Presiona "Buscar ahora" para obtener noticias de fuentes RSS' : 'Cambia el filtro para ver otros estados'}
          </p>
        </div>
      ) : (
        <div className="space-y-gutter">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-surface-container-lowest border rounded-xl p-4 shadow-sm transition-colors ${
                item.status === 'pending' ? 'border-outline-variant/30 hover:border-secondary' :
                (item.status === 'approved' || item.status === 'published') ? 'border-green-200 bg-green-50/30' :
                item.status === 'ignored' ? 'border-gray-200 bg-gray-50/30 opacity-70' :
                'border-blue-200 bg-blue-50/30'
              }`}
            >
              <div className="flex gap-4">
                {item.image_url && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-news.svg'; }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-body-md font-bold text-primary leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.comuna === 'Nacional' && (
                        <span className="bg-yellow-500/10 text-yellow-800 border border-yellow-500/25 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm animate-pulse">
                          <span className="material-symbols-outlined text-[13px] text-yellow-600">star</span>
                          Destacado Nacional
                        </span>
                      )}
                      <span className={`text-label-sm px-2 py-0.5 rounded-full ${STATUS_LABELS[item.status]?.color || 'bg-green-100 text-green-800'}`}>
                        {item.status === 'published' ? 'Aprobado' : STATUS_LABELS[item.status]?.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-label-sm text-on-surface-variant mb-2">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">source</span>
                      {item.source}
                    </span>
                    <span>{timeAgo(item.detected_at)}</span>
                    {item.is_duplicate && <span className="text-yellow-600">Duplicado</span>}
                  </div>

                  {item.summary && (
                    <p className="text-body-md text-on-surface-variant line-clamp-2 mb-3">{item.summary}</p>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 flex-wrap">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(item.id, 'approve', false)}
                          className="px-3 py-1.5 bg-secondary text-on-secondary rounded-lg text-label-sm font-label-sm hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          Aprobar Local
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'approve', true)}
                          className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm font-label-sm hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95 border border-primary/20"
                          title="Destacar a nivel nacional en la portada principal"
                        >
                          <span className="material-symbols-outlined text-[16px]">public</span>
                          Aprobar Nacional
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'ignored')}
                          className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-label-sm hover:bg-surface-container transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          Ignorar
                        </button>
                      </>
                    )}
                    {(item.status === 'approved' || item.status === 'published') && (
                      <button
                        onClick={() => handleAction(item.id, 'pending')}
                        className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-label-sm hover:bg-surface-container transition-colors flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span>
                        Desmarcar
                      </button>
                    )}
                    {item.status === 'ignored' && (
                      <button
                        onClick={() => handleAction(item.id, 'pending')}
                        className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-label-sm hover:bg-surface-container transition-colors flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span>
                        Recuperar
                      </button>
                    )}
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 border border-secondary/30 bg-secondary/5 hover:bg-secondary/10 text-secondary rounded-lg text-label-sm font-label-sm transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Editar noticia
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => window.open(item.source_url, '_blank', 'noopener,noreferrer')}
                      className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-label-sm hover:bg-surface-container transition-colors flex items-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Abrir fuente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info del módulo */}
      <div className="mt-stack-lg bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-secondary">info</span>
          <h2 className="text-label-md font-label-md text-primary">Sobre el Inbox RSS</h2>
        </div>
        <div className="text-body-md text-on-surface-variant space-y-2">
          <p>Fuentes configuradas: La Discusión, Radio Ñuble, BioBioChile, EMOL, Cooperativa, Google News Ñuble, Google News Chillán, Gobierno Regional.</p>
          <p>El sistema busca noticias cada 15 minutos (vía n8n) o manualmente con el botón "Buscar ahora". Las noticias NO se publican automáticamente: requieren aprobación manual desde este panel.</p>
          <p className="text-label-sm text-on-surface-variant/60">Módulo independiente — no interfiere con el sistema manual de noticias ni con la IA.</p>
        </div>
      </div>

      {/* Modal de Edición */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50">
              <h2 className="text-headline-md font-headline-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">edit</span>
                Editar Noticia del Inbox
              </h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 border border-outline-variant rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Título de la noticia *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
              </div>

              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Resumen (2-3 oraciones)</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Comuna de Ñuble</label>
                  <select
                    value={editComuna}
                    onChange={(e) => setEditComuna(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Nacional">🌐 Nacional (Destacado Nacional)</option>
                    {COMUNAS.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">URL de la Imagen (Pega aquí el enlace de la imagen copiada)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://ejemplo.cl/ruta-a-la-imagen.jpg"
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  />
                </div>
                {editImageUrl && editImageUrl.startsWith('http') && (
                  <div className="mt-2 relative aspect-video w-48 rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/30">
                    <img src={editImageUrl} alt="Vista previa" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-low/50">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
