'use client';

import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '@/lib/utils';

interface AdItem {
  id: string;
  name: string;
  location: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export default function AdminPublicidadPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Banner Principal');
  const [imageType, setImageType] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // File upload ref & preview
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFilePreview, setImageFilePreview] = useState<string | null>(null);

  // Google AdSense settings
  const [adsensePublisherId, setAdsensePublisherId] = useState('');
  const [adsenseAutoEnabled, setAdsenseAutoEnabled] = useState(false);
  const [adsenseSavedMsg, setAdsenseSavedMsg] = useState('');

  const apiUrl = getApiUrl();

  // Load Ads from Backend
  const loadAds = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/ads`);
      if (!res.ok) throw new Error('Error al cargar anuncios');
      const data = await res.json();
      setAds(data || []);
    } catch (err) {
      console.error('Error al cargar anuncios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Google AdSense configurations from LocalStore
  useEffect(() => {
    loadAds();
    if (typeof window !== 'undefined') {
      setAdsensePublisherId(localStorage.getItem('nexaa_adsense_pub_id') || '');
      setAdsenseAutoEnabled(localStorage.getItem('nexaa_adsense_auto_enabled') === 'true');
    }
  }, []);

  // Save Google AdSense configuration
  const handleSaveAdSenseConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexaa_adsense_pub_id', adsensePublisherId.trim());
      localStorage.setItem('nexaa_adsense_auto_enabled', String(adsenseAutoEnabled));
      setAdsenseSavedMsg('Configuración de AdSense guardada con éxito.');
      setTimeout(() => setAdsenseSavedMsg(''), 4000);
    }
  };

  // Handle local image file change (FileReader to Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast check for file size (e.g. limit to 2MB to keep DB sync speedy)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen seleccionada supera los 2MB. Te sugerimos optimizarla o comprimirla antes de subirla.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageFilePreview(base64);
      setImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Open creation modal
  const openCreateModal = () => {
    setEditingAd(null);
    setName('');
    setLocation('Banner Principal');
    setImageType('upload');
    setImageUrl('');
    setLinkUrl('');
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setImageFilePreview(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (ad: AdItem) => {
    setEditingAd(ad);
    setName(ad.name || '');
    setLocation(ad.location || 'Banner Principal');
    
    // Auto-detect image source type
    if (ad.image_url && ad.image_url.startsWith('data:image')) {
      setImageType('upload');
      setImageFilePreview(ad.image_url);
    } else {
      setImageType('url');
      setImageFilePreview(null);
    }
    
    setImageUrl(ad.image_url || '');
    setLinkUrl(ad.link_url || '');
    setIsActive(!!ad.is_active);
    
    // Format dates for HTML date inputs (YYYY-MM-DD)
    setStartDate(ad.start_date ? ad.start_date.substring(0, 10) : '');
    setEndDate(ad.end_date ? ad.end_date.substring(0, 10) : '');
    
    setIsModalOpen(true);
  };

  // Save ad (Create or Update)
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Por favor, ingresa el nombre de la campaña.');
    if (!imageUrl.trim()) return alert('Por favor, selecciona una imagen o introduce un enlace de imagen.');

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        location,
        image_url: imageUrl.trim(),
        link_url: linkUrl.trim(),
        is_active: isActive,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      };

      let res;
      if (editingAd) {
        // Update existing ad
        res = await fetch(`${apiUrl}/api/ads/${editingAd.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        // Create new ad
        res = await fetch(`${apiUrl}/api/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error('Error al guardar el anuncio en el servidor');

      setIsModalOpen(false);
      loadAds();
    } catch (err: any) {
      console.error(err);
      alert(`Error al guardar anuncio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive status immediately from card button
  const handleToggleActiveState = async (ad: AdItem) => {
    if (processingId) return;
    setProcessingId(ad.id);
    try {
      const res = await fetch(`${apiUrl}/api/ads/${ad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ad.is_active }),
      });
      if (!res.ok) throw new Error('Error al actualizar el estado del anuncio');
      loadAds();
    } catch (err: any) {
      console.error(err);
      alert(`Error al cambiar el estado: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Delete advertisement with confirm modal
  const handleDeleteAd = async (adId: string) => {
    if (processingId) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este anuncio permanentemente de la base de datos?')) return;

    setProcessingId(adId);
    try {
      const res = await fetch(`${apiUrl}/api/ads/${adId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar anuncio de la base de datos');
      loadAds();
    } catch (err: any) {
      console.error(err);
      alert(`Error al eliminar el anuncio: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-stack-lg">
      <div className="flex justify-between items-end mb-stack-lg flex-wrap gap-4">
        <div>
          <p className="text-on-surface-variant font-label-md text-label-sm uppercase tracking-widest mb-1">Monetización Directa</p>
          <h1 className="text-headline-lg font-headline-lg text-primary">Publicidad Directa</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestiona de forma manual las campañas publicitarias de tus clientes locales para portada, barra lateral y flujo de noticias.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-gutter py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:shadow-md hover:opacity-95 transition-all active:scale-95 flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nuevo anuncio
        </button>
      </div>

      {/* Grid of Advertisements */}
      {loading ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl">
          <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
          <p className="text-body-lg text-on-surface-variant mt-3 font-medium">Cargando anuncios activos...</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-12 text-center space-y-4">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-[64px]">ads_click</span>
          <p className="text-headline-md font-headline-md text-on-surface">No hay campañas publicitarias</p>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
            Crea tu primer banner de publicidad directa presionando el botón "Nuevo anuncio". Podrás subir la imagen de tu cliente al instante.
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-2 border border-secondary text-secondary rounded-xl hover:bg-secondary/5 font-label-md transition-colors"
          >
            Subir un banner ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {ads.map((ad) => {
            const isProcessing = processingId === ad.id;
            return (
              <div
                key={ad.id}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-gutter shadow-sm hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="min-w-0">
                      <h3 className="text-label-md font-bold text-primary truncate" title={ad.name}>
                        {ad.name}
                      </h3>
                      <span className="inline-block mt-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {ad.location}
                      </span>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors ${
                        ad.is_active ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-outline-variant'
                      }`}
                      title={ad.is_active ? 'Activo y visible' : 'Pausado/Inactivo'}
                    />
                  </div>

                  {/* Banner image preview */}
                  <div className="aspect-[16/9] w-full bg-surface-container-high rounded-xl overflow-hidden relative border border-outline-variant/10 mb-3 flex items-center justify-center">
                    {ad.image_url ? (
                      <img
                        src={ad.image_url}
                        alt={ad.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-on-surface-variant text-label-sm">Sin imagen</span>
                    )}
                  </div>

                  {/* Analytics counters */}
                  <div className="grid grid-cols-2 gap-2 bg-surface-container-low/40 border border-outline-variant/10 rounded-xl p-2.5 mb-3 text-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Impresiones</span>
                      <span className="text-body-md font-bold text-on-surface">{(ad.impressions || 0).toLocaleString()}</span>
                    </div>
                    <div className="border-l border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Clics</span>
                      <span className="text-body-md font-bold text-on-surface">{(ad.clicks || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dates tracker */}
                  {(ad.start_date || ad.end_date) && (
                    <div className="text-[11px] text-on-surface-variant/80 space-y-0.5 mb-3 bg-surface-container-low/10 rounded-lg p-2 border border-outline-variant/5">
                      {ad.start_date && (
                        <p className="flex items-center gap-1 justify-center">
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          Inicio: <span className="font-bold">{new Date(ad.start_date).toLocaleDateString('es-CL')}</span>
                        </p>
                      )}
                      {ad.end_date && (
                        <p className="flex items-center gap-1 justify-center">
                          <span className="material-symbols-outlined text-[12px]">event_busy</span>
                          Término: <span className="font-bold">{new Date(ad.end_date).toLocaleDateString('es-CL')}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                  <button
                    onClick={() => openEditModal(ad)}
                    disabled={isProcessing}
                    className="flex-1 py-2 border border-outline-variant/50 hover:border-secondary rounded-xl text-label-sm font-bold text-on-surface-variant hover:text-secondary transition-all hover:bg-secondary/5 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActiveState(ad)}
                    disabled={isProcessing}
                    className={`flex-1 py-2 border rounded-xl text-label-sm font-bold transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 ${
                      ad.is_active
                        ? 'border-outline-variant/50 hover:bg-error/5 hover:border-error text-on-surface-variant hover:text-error'
                        : 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-700 hover:border-green-500'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">{ad.is_active ? 'pause' : 'play_arrow'}</span>
                    )}
                    {ad.is_active ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteAd(ad.id)}
                    disabled={isProcessing}
                    className="p-2 border border-outline-variant/30 hover:border-error hover:bg-error-container hover:text-on-error-container rounded-xl text-on-surface-variant hover:text-error transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                    title="Eliminar campaña"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google AdSense Configuration Panel */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-gutter shadow-sm mt-stack-lg max-w-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="material-symbols-outlined text-secondary">monetization_on</span>
          <h2 className="text-headline-md font-headline-md text-primary">Google AdSense (Opcional)</h2>
        </div>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
          Si dispones de una cuenta de Google AdSense, puedes configurar tu ID de publicador aquí. Esto te permitirá inyectar bloques automatizados alternadamente.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-label-sm font-bold text-on-surface block mb-1">ID de publicador de AdSense</label>
            <input
              type="text"
              value={adsensePublisherId}
              onChange={(e) => setAdsensePublisherId(e.target.value)}
              placeholder="pub-xxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="adsense-auto"
              checked={adsenseAutoEnabled}
              onChange={(e) => setAdsenseAutoEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer"
            />
            <label htmlFor="adsense-auto" className="text-body-md text-on-surface select-none cursor-pointer">
              Habilitar inyección automática de AdSense
            </label>
          </div>
          
          {adsenseSavedMsg && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl text-label-sm font-semibold animate-fade-in flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">done</span>
              {adsenseSavedMsg}
            </div>
          )}

          <button
            onClick={handleSaveAdSenseConfig}
            className="px-6 py-2.5 bg-secondary text-on-secondary rounded-xl text-label-md font-bold hover:opacity-95 transition-opacity active:scale-95"
          >
            Guardar configuración
          </button>
        </div>
      </div>

      {/* EDIT / CREATE AD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up my-8">
            <div className="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/40 flex justify-between items-center">
              <h2 className="text-headline-md font-headline-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">
                  {editingAd ? 'edit' : 'add_circle'}
                </span>
                {editingAd ? 'Editar campaña de publicidad' : 'Nueva campaña publicitaria'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full p-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAd} className="p-gutter space-y-4">
              {/* Name */}
              <div>
                <label className="text-label-sm font-bold text-on-surface block mb-1">Nombre descriptivo del cliente/campaña *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Supermercado Chillán - Banner Central"
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-label-sm font-bold text-on-surface block mb-1">Ubicación del banner *</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                >
                  <option value="Banner Principal">Banner Principal (Portada superior / 728×90)</option>
                  <option value="Barra lateral">Barra lateral (Escritorio / 300×250)</option>
                  <option value="Entre noticias">Entre noticias (Flujo móvil y escritorio / 320×100 o 728×90)</option>
                </select>
              </div>

              {/* Image source toggle */}
              <div className="bg-surface-container-low rounded-xl p-1 border border-outline-variant/30 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setImageType('upload');
                    setImageUrl(imageFilePreview || '');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-label-sm font-bold transition-all flex items-center justify-center gap-1 ${
                    imageType === 'upload' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Subir Imagen Local
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageType('url');
                    setImageUrl(imageUrl && imageUrl.startsWith('data:image') ? '' : imageUrl);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-label-sm font-bold transition-all flex items-center justify-center gap-1 ${
                    imageType === 'url' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Pegar URL de Imagen
                </button>
              </div>

              {/* Image Input field based on selection */}
              {imageType === 'upload' ? (
                <div>
                  <label className="text-label-sm font-bold text-on-surface block mb-1">Cargar archivo de imagen *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-outline-variant rounded-xl text-label-sm font-bold hover:bg-surface-container transition-colors flex items-center gap-1 bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                      Seleccionar imagen...
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {imageFilePreview && (
                      <span className="text-label-sm text-green-700 font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[16px]">done</span>
                        Imagen cargada
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-label-sm font-bold text-on-surface block mb-1">Dirección URL de la imagen *</label>
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:image') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/publicidad/banner.jpg"
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                  />
                </div>
              )}

              {/* Live Preview Block */}
              {imageUrl && (
                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Vista previa de tu banner</span>
                  <div className="aspect-[16/6] bg-surface-container-high rounded-xl overflow-hidden relative border border-outline-variant/30 flex items-center justify-center max-w-full">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={() => {
                        // Soft fallback in case of load errors
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Link Url */}
              <div>
                <label className="text-label-sm font-bold text-on-surface block mb-1">URL de destino (Enlace de redirección)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.tusitiocliente.cl"
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                />
              </div>

              {/* Campaign Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface block mb-1">Fecha de Inicio (Opcional)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                  />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface block mb-1">Fecha de Término (Opcional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl focus:border-secondary outline-none transition-all text-body-md"
                  />
                </div>
              </div>

              {/* Active Toggle Status */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="ad-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-secondary cursor-pointer"
                />
                <label htmlFor="ad-active" className="text-body-md text-on-surface select-none cursor-pointer">
                  Activar campaña inmediatamente
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-4 border-t border-outline-variant/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Anuncio'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-xl text-label-md hover:bg-surface-container transition-colors active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
