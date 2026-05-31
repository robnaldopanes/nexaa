'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Photo {
  id: string;
  image_url: string;
  alt: string;
  title?: string;
  comuna?: string;
  photographer?: string;
  description?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  variant?: 'grid' | 'masonry' | 'hero';
}

export default function PhotoGallery({ photos, variant = 'grid' }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  if (variant === 'hero' && photos[0]) {
    return (
      <>
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden shadow-md cursor-pointer" onClick={() => setSelectedPhoto(photos[0])}>
          <Image
            src={photos[0].image_url}
            alt={photos[0].alt}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/45 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="text-white text-body-lg font-bold leading-tight drop-shadow">{photos[0].title || 'Miradas de Ñuble'}</p>
                {photos[0].description && (
                  <p className="text-white/80 text-label-md mt-1 italic drop-shadow-sm max-w-xl">
                    &ldquo;{photos[0].description}&rdquo;
                  </p>
                )}
                {photos[0].comuna && (
                  <p className="text-white/85 text-label-sm mt-1.5 flex items-center gap-0.5 drop-shadow-sm">
                    <span className="material-symbols-outlined text-[15px] text-secondary">location_on</span>
                    {photos[0].comuna}
                  </p>
                )}
              </div>
              {photos[0].photographer && (
                <div className="flex-shrink-0 self-start sm:self-auto bg-black/60 border border-white/15 backdrop-blur-md text-white px-3 py-1 rounded-full text-label-sm font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary">photo_camera</span>
                  <span>Foto: {photos[0].photographer}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Lightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="relative overflow-hidden aspect-square bg-surface-container-high"
          >
            <Image
              src={photo.image_url}
              alt={photo.alt}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
              unoptimized
            />
          </button>
        ))}
      </div>
      <Lightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </>
  );
}

function Lightbox({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <span className="material-symbols-outlined text-[24px]">close</span>
      </button>

      <div
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
          <Image
            src={photo.image_url}
            alt={photo.alt}
            fill
            className="object-contain"
            sizes="100vw"
            unoptimized
          />
        </div>

        <div className="mt-4 text-center">
          {photo.title && (
            <h3 className="text-white text-headline-md font-headline-md">{photo.title}</h3>
          )}
          <div className="flex items-center justify-center gap-3 mt-2 text-white/70 text-label-sm">
            {photo.comuna && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {photo.comuna}
              </span>
            )}
            {photo.photographer && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                {photo.photographer}
              </span>
            )}
          </div>
          {photo.description && (
            <p className="text-white/60 text-body-md mt-2 italic max-w-lg mx-auto">
              &ldquo;{photo.description}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
