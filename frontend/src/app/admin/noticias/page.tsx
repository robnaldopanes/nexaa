'use client';

import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, COMUNAS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/utils';
import { NewsItem } from '@/lib/types';

export default function AdminNoticiasPage() {
  const apiUrl = getApiUrl();
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [url, setUrl] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [previewAI, setPreviewAI] = useState<{ generated?: any; original?: any; error?: string } | null>(null);
  const [aiIsFeatured, setAiIsFeatured] = useState(false);
  const [aiIsBreaking, setAiIsBreaking] = useState(false);
  const [publishingAI, setPublishingAI] = useState(false);

  // Manual form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('');
  const [comuna, setComuna] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageType, setImageType] = useState<'upload' | 'url'>('upload');
  const [manualPreview, setManualPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState('');
  const [publishedList, setPublishedList] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [editNewsTitle, setEditNewsTitle] = useState('');
  const [editNewsContent, setEditNewsContent] = useState('');
  const [editNewsSummary, setEditNewsSummary] = useState('');
  const [editNewsCategory, setEditNewsCategory] = useState('');
  const [editNewsComuna, setEditNewsComuna] = useState('');
  const [editNewsImageUrl, setEditNewsImageUrl] = useState('');
  const [editNewsIsFeatured, setEditNewsIsFeatured] = useState(false);
  const [editNewsIsBreaking, setEditNewsIsBreaking] = useState(false);

  const loadPublishedNews = async () => {
    setLoadingNews(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setPublishedList(data || []);
    } catch (err) {
      console.error('Error al cargar noticias publicadas:', err);
      setPublishedList([]);
    }
    setLoadingNews(false);
  };

  useEffect(() => {
    loadPublishedNews();
  }, []);

  const openEditNewsModal = (item: NewsItem) => {
    setEditingNewsItem(item);
    setEditNewsTitle(item.title || '');
    setEditNewsContent(item.content || '');
    setEditNewsSummary(item.summary || '');
    setEditNewsCategory(item.category || '');
    setEditNewsComuna(item.comuna || '');
    setEditNewsImageUrl(item.image_url || '');
    setEditNewsIsFeatured(!!item.is_featured);
    setEditNewsIsBreaking(!!item.is_breaking);
  };

  const handleSaveNewsEdit = async () => {
    if (!editingNewsItem) return;
    try {
      const response = await fetch(`${apiUrl}/api/news/${editingNewsItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editNewsTitle.trim(),
          content: editNewsContent.trim(),
          summary: editNewsSummary.trim(),
          category: editNewsCategory,
          comuna: editNewsComuna,
          image_url: editNewsImageUrl.trim(),
          is_featured: editNewsIsFeatured,
          is_breaking: editNewsIsBreaking,
          slug: editNewsTitle.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la noticia a través de la API.');
      }

      setEditingNewsItem(null);
      alert('La noticia ha sido actualizada correctamente en la base de datos.');
      loadPublishedNews();
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cambios de la noticia.');
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyzeURL = async () => {
    if (!url.trim()) return;
    setLoadingAI(true);
    setPreviewAI(null);
    setAiIsFeatured(false);
    setAiIsBreaking(false);
    try {
      const res = await fetch(`${apiUrl}/api/news/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setPreviewAI(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setPreviewAI({ error: message });
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePublishAIPending = async () => {
    if (!previewAI || !previewAI.generated) return;
    setPublishingAI(true);
    try {
      const generated = previewAI.generated;
      const original = previewAI.original;
      
      const body = {
        title: generated.title.trim(),
        content: original.content.trim(),
        summary: generated.summary.trim() || generated.title.trim(),
        category: generated.category || 'Regional',
        comuna: generated.comuna || 'Ñuble',
        is_featured: aiIsFeatured,
        is_breaking: aiIsBreaking,
        ai_generated: true,
        is_approved: true,
        is_published: true,
        source_name: original.title ? (original.title.includes('Discusión') ? 'La Discusión' : original.title.includes('Radio') ? 'Radio Ñuble' : 'Fuente externa') : 'Fuente externa',
        source_url: original.sourceUrl || url,
        tags: generated.tags || [],
        image_url: original.imageUrl || '',
        slug: generated.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100),
      };

      const res = await fetch(`${apiUrl}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al publicar noticia generada por IA');

      setPreviewAI(null);
      setUrl('');
      setPublishedMsg('¡Noticia generada por IA publicada correctamente!');
      loadPublishedNews();
      setTimeout(() => setPublishedMsg(''), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error al publicar la noticia: ${message}`);
    } finally {
      setPublishingAI(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl('');
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleManualPublish = () => {
    if (!title.trim() || !content.trim()) return;
    setManualPreview(true);
    // En producción: POST /api/news con FormData (título, contenido, resumen, categoría, comuna, imagen)
  };

  const handlePublishNow = async () => {
    if (!title.trim() || !content.trim()) return;
    setPublishing(true);

    try {
      // Subir imagen si es un archivo local (base64)
      let finalImageUrl = imageUrl.trim();
      if (!finalImageUrl && imagePreview && imagePreview.startsWith('data:image')) {
        try {
          const uploadRes = await fetch(`${apiUrl}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imagePreview }),
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            finalImageUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.error('Error subiendo imagen:', uploadErr);
        }
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || title.trim(),
        category: category || 'Regional',
        comuna: comuna || 'Ñuble',
        is_featured: isFeatured,
        is_breaking: isBreaking,
        ai_generated: false,
        is_approved: true,
        is_published: true,
        source_name: 'NEXAA - Manual',
        tags: [],
        slug: title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80),
      };
      if (finalImageUrl) body.image_url = finalImageUrl;

      const res = await fetch(`${apiUrl}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Backend no disponible');

      setPublishedMsg('¡Noticia publicada correctamente!');
    } catch {
      // Modo local: guardar en la lista visible
      const localNews: NewsItem = {
        id: `local-${Date.now()}`,
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || imagePreview || '',
        source_url: '',
        source_name: 'NEXAA - Manual',
        category: category || 'Regional',
        comuna: comuna || 'Ñuble',
        tags: [],
        is_featured: isFeatured,
        is_breaking: isBreaking,
        is_approved: true,
        is_published: true,
        ai_generated: false,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        views: 0,
        slug: title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80),
      };
      setPublishedList(prev => [localNews, ...prev]);
      setPublishedMsg('Noticia guardada localmente (Supabase no configurado).');
    }

    setManualPreview(false);
    setPublishing(false);
    setTitle('');
    setContent('');
    setSummary('');
    setCategory('');
    setComuna('');
    setImagePreview(null);
    setImageFile(null);
    setImageUrl('');
    setImageType('upload');
    setIsFeatured(false);
    setIsBreaking(false);

    setTimeout(() => setPublishedMsg(''), 4000);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-stack-lg">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">Gestión</p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Noticias</h1>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-stack-md">
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2 rounded-xl text-label-md font-label-md transition-colors ${
            mode === 'ai' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">auto_awesome</span>
          Pegar enlace + IA
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-xl text-label-md font-label-md transition-colors ${
            mode === 'manual' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">edit_note</span>
          Escribir manual
        </button>
      </div>

      {/* === MODO IA: PEGAR ENLACE === */}
      {mode === 'ai' && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm mb-stack-lg">
          <h2 className="text-headline-md font-headline-md text-primary mb-3">Publicar desde enlace con IA</h2>
          <p className="text-body-md text-on-surface-variant mb-4">
            Pega un enlace de noticia y la IA analizará automáticamente el contenido.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ejemplo.cl/noticia..."
              className="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-body-md"
            />
            <button
              onClick={handleAnalyzeURL}
              disabled={loadingAI}
              className="px-6 py-3 bg-secondary text-on-secondary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {loadingAI ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Analizando...</>
              ) : (
                'Analizar'
              )}
            </button>
          </div>

          {previewAI?.error && (
            <div className="mt-4 p-4 bg-error-container text-on-error-container rounded-xl text-label-md">
              Error: {previewAI.error}
            </div>
          )}

          {previewAI?.generated && (
            <div className="mt-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined material-symbols-filled text-secondary">auto_awesome</span>
                <span className="text-label-md font-label-md text-on-surface-variant">Vista previa IA</span>
                <span className={`text-label-sm px-2 py-0.5 rounded-full ml-auto ${previewAI.generated._engine === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {previewAI.generated._engine === 'gemini' ? 'Gemini' : 'Demo'}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-label-sm text-on-surface-variant">Título generado</span>
                  <p className="text-body-md font-bold text-primary">{previewAI.generated.title}</p>
                </div>
                <div>
                  <span className="text-label-sm text-on-surface-variant">Resumen</span>
                  <p className="text-body-md text-on-surface">{previewAI.generated.summary}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-label-sm rounded-full">
                    {previewAI.generated.category}
                  </span>
                  {previewAI.generated.comuna && (
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm rounded-full">
                      📍 {previewAI.generated.comuna}
                    </span>
                  )}
                </div>
                {previewAI.generated.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {previewAI.generated.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-label-sm rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
                {previewAI.original?.imageUrl && (
                  <div className="mt-2">
                    <span className="text-label-sm text-on-surface-variant block mb-1">Imagen detectada</span>
                    <div className="relative aspect-video w-48 rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/30">
                      <img src={previewAI.original.imageUrl} alt="Imagen noticia" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Opciones de destacar/urgente en IA */}
                <div className="flex gap-4 py-2 border-t border-b border-outline-variant/20 my-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={aiIsFeatured} onChange={(e) => setAiIsFeatured(e.target.checked)} className="rounded" />
                    <span className="text-body-md text-on-surface">Noticia destacada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={aiIsBreaking} onChange={(e) => setAiIsBreaking(e.target.checked)} className="rounded" />
                    <span className="text-body-md text-on-surface">Urgente</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePublishAIPending}
                    disabled={publishingAI}
                    className="px-6 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {publishingAI ? (
                      <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Publicando...</>
                    ) : (
                      'Publicar ahora'
                    )}
                  </button>
                  <button
                    onClick={() => { setPreviewAI(null); setUrl(''); }}
                    className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container transition-colors animate-fade-in"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === MODO MANUAL: ESCRIBIR NOTICIA === */}
      {mode === 'manual' && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm mb-stack-lg">
          <h2 className="text-headline-md font-headline-md text-primary mb-3">Escribir noticia manualmente</h2>

          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Título de la noticia *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe el titular..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
              />
            </div>

            {/* Contenido */}
            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Contenido *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Escribe o pega el contenido completo de la noticia..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
              />
            </div>

            {/* Resumen */}
            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Resumen (opcional, si no se llena lo genera la IA)</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                placeholder="Resumen breve de 2-3 líneas..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
              />
            </div>

            {/* Categoría + Comuna */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md">
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Comuna</label>
                <select value={comuna} onChange={(e) => setComuna(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md">
                  <option value="">Seleccionar...</option>
                  <option value="Nacional">🌐 Nacional (Destacado Nacional)</option>
                  <option value="Internacional">🌎 Internacional</option>
                  {COMUNAS.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Imagen */}
            <div>
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Fotografía</label>

              {/* Toggle origen de imagen */}
              <div className="bg-surface-container-low rounded-xl p-1 border border-outline-variant/30 flex gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setImageType('upload');
                    setImageUrl('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-label-sm font-bold transition-all flex items-center justify-center gap-1 ${
                    imageType === 'upload' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Subir archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageType('url');
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-label-sm font-bold transition-all flex items-center justify-center gap-1 ${
                    imageType === 'url' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Pegar URL
                </button>
              </div>

              {imageType === 'upload' ? (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-container-high">
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setImagePreview(null); setImageFile(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video bg-surface-container-high rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant hover:border-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[48px]">add_photo_alternate</span>
                      <span className="text-label-md text-on-surface-variant">Clic para subir imagen</span>
                      <span className="text-label-sm text-on-surface-variant/60">JPG, PNG o WebP</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  />
                  {imageUrl && (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant/30">
                      <img
                        src={imageUrl}
                        alt="Vista previa URL"
                        className="w-full h-full object-cover"
                        onError={() => { setImagePreview(null); }}
                      />
                      <button
                        onClick={() => { setImageUrl(''); setImagePreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opciones */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
                <span className="text-body-md text-on-surface">Noticia destacada</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} className="rounded" />
                <span className="text-body-md text-on-surface">Urgente</span>
              </label>
            </div>

            {publishedMsg && (
              <div className="mb-stack-md p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-label-md font-label-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                {publishedMsg}
              </div>
            )}

            {manualPreview ? (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">preview</span>
                  <span className="text-label-md font-label-md text-on-surface-variant">Confirmar publicación</span>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                  <h3 className="text-body-md font-bold text-primary">{title}</h3>
                  <p className="text-body-md text-on-surface mt-2">{content.slice(0, 200)}{content.length > 200 ? '...' : ''}</p>
                  <div className="flex gap-2 mt-3">
                    {category && <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-label-sm rounded-full">{category}</span>}
                    {comuna && <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface text-label-sm rounded-full">📍 {comuna}</span>}
                    {isFeatured && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-label-sm rounded-full">Destacada</span>}
                    {isBreaking && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-label-sm rounded-full">Urgente</span>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handlePublishNow} disabled={publishing} className="px-6 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                    {publishing ? (
                      <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Publicando...</>
                    ) : (
                      'Publicar ahora'
                    )}
                  </button>
                  <button onClick={() => setManualPreview(false)} className="px-6 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container transition-colors">
                    Seguir editando
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleManualPublish}
                className="px-6 py-3 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">publish</span>
                Revisar y publicar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de noticias publicadas */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
        <div className="px-gutter py-4 border-b border-outline-variant/30 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-surface-container-low/50">
          <h2 className="text-headline-md font-headline-md text-primary">Noticias Publicadas</h2>
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-2 bg-surface border border-outline-variant rounded-lg text-label-md outline-none">
              <option>Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c.slug}>{c.name}</option>)}
            </select>
            <select className="px-3 py-2 bg-surface border border-outline-variant rounded-lg text-label-md outline-none">
              <option>Más recientes</option>
              <option>Más vistas</option>
              <option>Destacadas</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {loadingNews ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined animate-spin text-secondary text-[36px]">progress_activity</span>
              <p className="text-body-md text-on-surface-variant mt-2">Cargando noticias...</p>
            </div>
          ) : publishedList.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              No hay noticias registradas.
            </div>
          ) : (
            publishedList.map((item) => (
              <div key={item.id} className="px-gutter py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-lowest transition-colors">
                <div className="flex gap-3 items-center min-w-0 flex-1">
                  {item.image_url && (
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/20 shadow-sm animate-fade-in">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 max-w-full">
                      <p className="text-label-md font-label-md text-primary truncate" title={item.title}>
                        {item.title}
                      </p>
                      {item.source_url && (
                        <a 
                          href={item.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-secondary hover:text-primary transition-colors flex-shrink-0"
                          title={`Ver fuente original: ${item.source_name || 'Enlace'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <p className="text-label-sm text-on-surface-variant">
                      {new Date(item.published_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · {item.views || 0} visitas · Comuna: {item.comuna || 'Regional'}{item.source_name ? ` · Fuente: ${item.source_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 sm:ml-4">
                  {item.is_featured && (
                    <span className="text-label-sm px-2.5 py-0.5 bg-yellow-400/10 text-yellow-950 border border-yellow-400/20 rounded-full flex items-center gap-0.5 font-bold shadow-sm">
                      <span className="material-symbols-outlined text-[14px] text-yellow-600 font-bold">star</span>
                      Destacada
                    </span>
                  )}
                  <span className={`text-label-sm px-2 py-0.5 rounded-full ${item.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.is_published ? 'Publicado' : 'Borrador'}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';
                        const res = await fetch(`${apiUrl}/api/news/${item.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ is_featured: !item.is_featured }),
                        });
                        if (res.ok) {
                          loadPublishedNews();
                        } else {
                          alert('Error al cambiar estado destacado');
                        }
                      } catch {
                        alert('Error de conexión');
                      }
                    }}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors active:scale-95 shadow-sm ${
                      item.is_featured 
                        ? 'bg-yellow-400/25 text-yellow-900 border border-yellow-400/35' 
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-outline-variant/30'
                    }`}
                    title={item.is_featured ? 'Quitar de destacadas' : 'Destacar en carrusel'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.is_featured ? 'star' : 'star_rate'}
                    </span>
                  </button>
                  <button
                    onClick={() => openEditNewsModal(item)}
                    className="px-3 py-1.5 bg-secondary text-on-secondary rounded-lg text-label-sm font-label-sm hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95 shadow-sm"
                    aria-label="Editar noticia"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      const action = item.is_published ? 'quitar de la página principal' : 'publicar en la página principal';
                      if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${item.title}"?`)) return;
                      try {
                        const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';
                        const res = await fetch(`${apiUrl}/api/news/${item.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ is_published: !item.is_published }),
                        });
                        if (res.ok) {
                          loadPublishedNews();
                        } else {
                          alert('Error al cambiar estado de publicación');
                        }
                      } catch {
                        alert('Error de conexión');
                      }
                    }}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors active:scale-95 shadow-sm ${
                      item.is_published
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                    title={item.is_published ? 'Quitar de la página principal' : 'Publicar en la página principal'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.is_published ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Edición de Noticia Publicada */}
      {editingNewsItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50">
              <h2 className="text-headline-md font-headline-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">edit</span>
                Editar Noticia Publicada
              </h2>
              <button
                onClick={() => setEditingNewsItem(null)}
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
                  value={editNewsTitle}
                  onChange={(e) => setEditNewsTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
              </div>

              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Contenido *</label>
                <textarea
                  value={editNewsContent}
                  onChange={(e) => setEditNewsContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
                />
              </div>

              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Resumen (para el feed público)</label>
                <textarea
                  value={editNewsSummary}
                  onChange={(e) => setEditNewsSummary(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Categoría</label>
                  <select
                    value={editNewsCategory}
                    onChange={(e) => setEditNewsCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Comuna</label>
                  <select
                    value={editNewsComuna}
                    onChange={(e) => setEditNewsComuna(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Nacional">🌐 Nacional (Destacado Nacional)</option>
                    <option value="Internacional">🌎 Internacional</option>
                    {COMUNAS.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">URL de la Imagen (Pega aquí la dirección de la imagen copiada) *</label>
                <input
                  type="url"
                  value={editNewsImageUrl}
                  onChange={(e) => setEditNewsImageUrl(e.target.value)}
                  placeholder="https://ejemplo.cl/imagen.jpg"
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                />
                {editNewsImageUrl && editNewsImageUrl.startsWith('http') && (
                  <div className="mt-2 relative aspect-video w-48 rounded-lg overflow-hidden bg-surface-container-high border border-outline-variant/30">
                    <img src={editNewsImageUrl} alt="Vista previa" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editNewsIsFeatured} onChange={(e) => setEditNewsIsFeatured(e.target.checked)} className="rounded" />
                  <span className="text-body-md text-on-surface">Noticia destacada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editNewsIsBreaking} onChange={(e) => setEditNewsIsBreaking(e.target.checked)} className="rounded" />
                  <span className="text-body-md text-on-surface">Urgente</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-low/50">
              <button
                onClick={() => setEditingNewsItem(null)}
                className="px-4 py-2 border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewsEdit}
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
