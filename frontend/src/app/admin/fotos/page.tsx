'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SubmissionItem {
  id: string;
  type: string;
  content: string; // JSON string
  image_url: string;
  user_name: string;
  user_email: string | null;
  status: string;
  created_at: string;
}

interface PhotoItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  photographer: string;
  comuna: string;
  category: string;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
}

export default function AdminFotosPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // For fullscreen preview modal

  const loadData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';
      
      // 1. Cargar submissions de fotos pendientes mediante el backend API (que evade RLS usando service key)
      const resSubs = await fetch(`${apiUrl}/api/photos/submissions?status=pending`);
      if (!resSubs.ok) throw new Error('Error al cargar solicitudes pendientes');
      const subData = await resSubs.json();
      setSubmissions(subData || []);

      // 2. Cargar todas las fotos publicadas mediante el backend API
      const resPhotos = await fetch(`${apiUrl}/api/photos`);
      if (!resPhotos.ok) throw new Error('Error al cargar fotos de la galería');
      const photoData = await resPhotos.json();
      setPhotos(photoData || []);

    } catch (err) {
      console.error('Error al cargar fotografías:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (submission: SubmissionItem) => {
    if (processingId) return;
    setProcessingId(submission.id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';

      // 1. Parsear el contenido estructurado
      let parsed: any = {};
      try {
        parsed = typeof submission.content === 'string' 
          ? JSON.parse(submission.content) 
          : (submission.content || {});
      } catch (e) {
        console.warn('Error parsing submission content JSON:', e);
      }
      if (!parsed) parsed = {};

      const photographerName = parsed.photographer || submission.user_name || 'Colaborador';
      const photoTitle = parsed.title || 'Sin título';
      const photoDesc = parsed.description || '';
      const photoComuna = parsed.comuna || 'Ñuble';

      // 2. Insertar la foto en la tabla final a través de la API
      const resInsert = await fetch(`${apiUrl}/api/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: photoTitle,
          description: photoDesc,
          image_url: submission.image_url,
          photographer: photographerName,
          comuna: photoComuna,
          category: 'General',
          is_approved: true,
          is_featured: false,
        }),
      });

      if (!resInsert.ok) {
        const errorData = await resInsert.json();
        throw new Error(errorData.error || 'Error al crear fotografía');
      }

      // 3. Marcar la solicitud como aprobada
      const resUpdate = await fetch(`${apiUrl}/api/photos/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!resUpdate.ok) {
        const errorData = await resUpdate.json();
        throw new Error(errorData.error || 'Error al actualizar solicitud');
      }

      await loadData();
    } catch (err: any) {
      console.error('Error al aprobar fotografía:', err);
      toast.error(`Error al aprobar: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (processingId) return;
    toast('¿Rechazar esta fotografía?', {
      description: 'Se descartará del inbox.',
      action: {
        label: 'Rechazar',
        onClick: async () => {
          try {
            const { error } = await supabase.from('user_submissions').delete().eq('id', id);
            if (error) throw error;
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
            toast.success('Fotografía rechazada');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            toast.error(`Error al rechazar: ${message}`);
          }
        },
      },
    });
  };

  const handleDeletePhoto = async (id: string) => {
    if (processingId) return;
    toast('¿Eliminar permanentemente esta foto de la galería pública?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/photos/${id}`, {
              method: 'DELETE',
            });
            
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Error al eliminar foto');
            }

            setPhotos((prev) => prev.filter((p) => p.id !== id));
            toast.success('Foto eliminada');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            toast.error(`Error al eliminar: ${message}`);
          }
        },
      },
    });
  };

  const handleToggleFeatured = async (photo: PhotoItem) => {
    if (processingId) return;
    setProcessingId(photo.id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_NEXAA_API_URL || 'http://localhost:3001';
      const newFeaturedState = !photo.is_featured;

      const res = await fetch(`${apiUrl}/api/photos/${photo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: newFeaturedState }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al cambiar destacado');
      }

      await loadData();
    } catch (err: any) {
      console.error('Error al cambiar destacado:', err);
      toast.error(`Error al cambiar destacado: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getParsedContent = (contentStr: any) => {
    if (!contentStr) return {};
    try {
      const parsed = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr;
      return parsed || {};
    } catch (e) {
      return {};
    }
  };

  return (
    <div className="space-y-stack-lg">
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">
            Módulo Colaborativo
          </p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Galería de Imágenes</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Modera las fotografías enviadas por los usuarios y gestiona la galería pública de Ñuble.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
          <p className="text-body-lg text-on-surface-variant mt-3">Cargando fotografías...</p>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: PENDIENTES DE APROBACIÓN */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pending_actions</span>
                <h2 className="text-headline-md font-headline-md text-primary">Pendientes de Aprobación</h2>
              </div>
              <span className="bg-secondary/20 text-secondary text-label-md font-bold px-3 py-1 rounded-full">
                {submissions.length} {submissions.length === 1 ? 'solicitud' : 'solicitudes'}
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-[56px]">check_circle</span>
                <p className="text-body-lg font-bold text-on-surface">¡Todo al día!</p>
                <p className="text-body-md">No hay fotos enviadas por usuarios pendientes de revisión.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {submissions.map((sub) => {
                  const details = getParsedContent(sub.content);
                  const isProcessing = processingId === sub.id;
                  
                  return (
                    <div 
                      key={sub.id} 
                      className="bg-surface-container-low border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group"
                    >
                      {/* Imagen Preview */}
                      <div className="relative aspect-video bg-black/90 overflow-hidden cursor-zoom-in group" onClick={() => setSelectedImage(sub.image_url)}>
                        <img 
                          src={sub.image_url} 
                          alt={details.title || 'Foto subida'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[32px]">zoom_in</span>
                        </div>
                        {details.comuna && (
                          <span className="absolute bottom-2 left-2 bg-black/60 text-white backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                            {details.comuna}
                          </span>
                        )}
                      </div>

                      {/* Info de la foto */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-body-lg font-bold text-primary leading-tight line-clamp-1">
                            {details.title || 'Sin Título'}
                          </h3>
                          {details.description && (
                            <p className="text-body-md text-on-surface-variant line-clamp-2 italic">
                              "{details.description}"
                            </p>
                          )}
                          <div className="text-label-sm text-on-surface-variant/80 space-y-0.5 pt-2 border-t border-outline-variant/20">
                            <p className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                              Enviado por: <span className="font-bold text-on-surface">{details.photographer || sub.user_name || 'Anónimo'}</span>
                            </p>
                            {sub.user_email && (
                              <p className="flex items-center gap-1 break-all">
                                <span className="material-symbols-outlined text-[14px]">mail</span>
                                {sub.user_email}
                              </p>
                            )}
                            <p className="flex items-center gap-1 text-[11px] text-on-surface-variant/60">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {new Date(sub.created_at).toLocaleDateString('es-CL', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 pt-3">
                          <button
                            onClick={() => handleApprove(sub)}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-secondary text-on-secondary hover:opacity-95 rounded-lg text-label-sm font-label-sm font-bold flex items-center justify-center gap-1 transition-opacity active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            disabled={isProcessing}
                            className="py-2 px-3 border border-error/30 text-error hover:bg-error/5 rounded-lg text-label-sm font-label-sm font-bold flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
                            title="Rechazar y descartar"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: GALERÍA PUBLICADA */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">photo_library</span>
                <h2 className="text-headline-md font-headline-md text-primary">Galería Pública Publicada</h2>
              </div>
              <span className="text-label-sm text-on-surface-variant font-bold">
                {photos.length} {photos.length === 1 ? 'fotografía activa' : 'fotografías activas'}
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-[56px]">landscape</span>
                <p className="text-body-lg font-bold text-on-surface">Galería vacía</p>
                <p className="text-body-md">Aún no hay fotos aprobadas para mostrarse en el portal.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
                {photos.map((photo) => {
                  const isProcessing = processingId === photo.id;
                  
                  return (
                    <div 
                      key={photo.id} 
                      className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm flex flex-col group relative"
                    >
                      {/* Imagen con badge destacado */}
                      <div className="relative aspect-square bg-black overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(photo.image_url)}>
                        <img 
                          src={photo.image_url} 
                          alt={photo.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                        </div>
                        {photo.is_featured && (
                          <span className="absolute top-2 left-2 bg-yellow-500 text-black font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">star</span>
                            Destacada
                          </span>
                        )}
                        {photo.comuna && (
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white/90 backdrop-blur-sm text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {photo.comuna}
                          </span>
                        )}
                      </div>

                      {/* Detalle y acciones */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div className="min-w-0">
                          <h4 className="text-label-md font-bold text-primary leading-tight truncate" title={photo.title}>
                            {photo.title}
                          </h4>
                          <p className="text-[10px] text-on-surface-variant/80 truncate">
                            📸 {photo.photographer}
                          </p>
                        </div>

                        {/* Botones rápidos en el card */}
                        <div className="flex gap-1.5 border-t border-outline-variant/10 pt-2">
                          <button
                            onClick={() => handleToggleFeatured(photo)}
                            disabled={isProcessing}
                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                              photo.is_featured 
                                ? 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30' 
                                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                            }`}
                            title={photo.is_featured ? 'Quitar de destacada' : 'Destacar en portada'}
                          >
                            <span className="material-symbols-outlined text-[12px]">{photo.is_featured ? 'star' : 'star_rate'}</span>
                            {photo.is_featured ? 'Destacada' : 'Destacar'}
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={isProcessing}
                            className="p-1 px-1.5 bg-error/10 text-error hover:bg-error/20 rounded transition-colors"
                            title="Eliminar de la galería"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL DE IMAGEN FULLSCREEN */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <img src={selectedImage} alt="Fullscreen preview" className="max-w-full max-h-[85vh] object-contain" />
            <button 
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 shadow transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
