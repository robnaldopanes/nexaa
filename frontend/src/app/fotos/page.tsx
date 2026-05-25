'use client';

import { useState, useRef, useEffect } from 'react';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import SectionHeader from '@/components/ui/SectionHeader';
import PhotoGallery from '@/components/news/PhotoGallery';
import { COMUNAS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/utils';

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

const DEFAULT_FEATURED_PHOTO = {
  id: 'fp1',
  image_url: 'https://images.unsplash.com/photo-1578518451874-5f4885f3880c?w=1200&q=80',
  alt: 'Nevados de Chillán al amanecer',
  title: 'Amanecer en los Nevados de Chillán',
  comuna: 'Pinto',
};

const DEFAULT_PHOTOS = [
  { id: 'g1', image_url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600&q=80', alt: 'Catedral de Chillán', title: 'Arquitectura brutalista', comuna: 'Chillán' },
  { id: 'g2', image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80', alt: 'Bosque nativo', title: 'Reserva Nacional Ñuble', comuna: 'San Fabián' },
  { id: 'g3', image_url: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80', alt: 'Valle del Itata', title: 'Viñedos del Itata', comuna: 'Coelemu' },
  { id: 'g4', image_url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80', alt: 'Alfarería Quinchamalí', title: 'Artesanía local', comuna: 'Chillán' },
];

export default function PhotosPage() {
  const apiUrl = getApiUrl();
  const [featuredPhoto, setFeaturedPhoto] = useState<any>(DEFAULT_FEATURED_PHOTO);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Encontrar destacada
        const featured = data.find(p => p.is_featured) || data[0];
        setFeaturedPhoto({
          id: featured.id,
          image_url: featured.image_url,
          alt: featured.title || 'Foto de Ñuble',
          title: featured.title || 'Amanecer regional',
          comuna: featured.comuna || 'Ñuble',
          photographer: featured.photographer || 'Colaborador',
          description: featured.description || ''
        });

        // Filtrar restantes para la galería
        const remaining = data.filter(p => p.id !== featured.id);
        setGalleryPhotos(remaining.map(p => ({
          id: p.id,
          image_url: p.image_url,
          alt: p.title || 'Foto de Ñuble',
          title: p.title || 'Imagen local',
          comuna: p.comuna || 'Ñuble'
        })));
      } else {
        setFeaturedPhoto(DEFAULT_FEATURED_PHOTO);
        setGalleryPhotos(DEFAULT_PHOTOS);
      }
    } catch (err) {
      console.error('Error al cargar fotos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#subir') {
      setShowForm(true);
      setTimeout(() => {
        document.getElementById('upload-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar 10 MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !title.trim()) return;
    setSending(true);

    try {
      // 1. Guardar en user_submissions en Supabase (tiene RLS abierto para inserción pública)
      const { error } = await supabase
        .from('user_submissions')
        .insert({
          type: 'photo',
          content: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            photographer: photographer.trim(),
            photographer_email: email.trim(),
            comuna: comuna || null,
          }),
          image_url: imagePreview,
          user_name: photographer.trim() || 'Anónimo',
          user_email: email.trim() || null,
          status: 'pending'
        });

      if (error) {
        // Intentar fallback al backend si falla Supabase RLS
        const res = await fetch(`${apiUrl}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            image_url: imagePreview,
            photographer: photographer.trim(),
            photographer_email: email.trim(),
            comuna: comuna || null,
            is_approved: false,
          }),
        });
        if (!res.ok) throw new Error('Ambas conexiones fallaron');
      }

      setSent(true);
      setTimeout(() => resetForm(), 2000);
    } catch (err) {
      console.error('Error al enviar foto:', err);
      alert('Error al enviar tu fotografía. Inténtalo de nuevo más tarde.');
      setSending(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSent(false);
    setSending(false);
    setTitle('');
    setDescription('');
    setPhotographer('');
    setEmail('');
    setComuna('');
    setImagePreview(null);
    setImageFile(null);
  };

  return (
    <>
      <TopAppBar />
      <main className="pt-14 pb-20 overflow-x-hidden">
        {loading ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
            <p className="text-body-lg text-on-surface-variant mt-3">Abriendo galería...</p>
          </div>
        ) : (
          <>
            <section className="mt-stack-md">
              <SectionHeader title="Foto Destacada" />
              <div className="px-margin-mobile">
                <PhotoGallery photos={[featuredPhoto]} variant="hero" />
              </div>
            </section>

            {galleryPhotos.length > 0 && (
              <section className="mt-stack-lg px-margin-mobile">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-headline-md font-headline-md">Galería</h3>
                  <span className="text-label-sm text-on-surface-variant">Más recientes</span>
                </div>
                <PhotoGallery photos={galleryPhotos} variant="grid" />
              </section>
            )}
          </>
        )}

        {/* Botón para abrir formulario */}
        <section className="mt-stack-lg px-margin-mobile">
          {!showForm ? (
            <div className="ai-glow rounded-xl p-4 bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary text-[20px]">add_a_photo</span>
                <h2 className="text-label-md font-label-md text-on-surface-variant">
                  ¿Tienes fotos de Ñuble?
                </h2>
              </div>
              <p className="text-body-md text-on-surface mb-3">
                Comparte tus mejores fotografías de la región y aparecerán en nuestra galería con tus créditos.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity"
              >
                Enviar fotografía
              </button>
            </div>
          ) : (
            <div id="upload-form" className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-gutter shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">add_a_photo</span>
                  <h2 className="text-headline-md font-headline-md text-primary">Enviar fotografía</h2>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subida de imagen */}
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-2">Fotografía *</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-container-high">
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setImageFile(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video bg-surface-container-high rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant hover:border-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[48px]">cloud_upload</span>
                      <span className="text-label-md text-on-surface-variant">Toca para seleccionar una foto</span>
                      <span className="text-label-sm text-on-surface-variant/60">JPG, PNG o WebP · Máx 10 MB</span>
                    </button>
                  )}
                </div>

                {/* Título */}
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Título de la foto *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Atardecer en Cobquecura"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Descripción (opcional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Cuéntanos sobre la foto, dónde fue tomada..."
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md resize-y"
                  />
                </div>

                {/* Fotógrafo + Comuna */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Tu nombre</label>
                    <input
                      type="text"
                      value={photographer}
                      onChange={(e) => setPhotographer(e.target.value)}
                      placeholder="Para darte el crédito"
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Comuna</label>
                    <select value={comuna} onChange={(e) => setComuna(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md">
                      <option value="">Seleccionar...</option>
                      {COMUNAS.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Correo electrónico (opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Para avisarte cuando se publique"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none text-body-md"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending || sent || !imageFile || !title.trim()}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Enviando...</>
                  ) : sent ? (
                    <><span className="material-symbols-outlined text-[20px]">check_circle</span> ¡Enviado! Será revisado pronto</>
                  ) : (
                    <><span className="material-symbols-outlined text-[20px]">send</span> Enviar fotografía</>
                  )}
                </button>

                <p className="text-label-sm text-on-surface-variant/60 text-center">
                  Las fotografías enviadas pasan por revisión antes de publicarse. Al enviar aceptas que tu foto aparezca con tus créditos en NEXAA.
                </p>
              </form>
            </div>
          )}
        </section>

        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
