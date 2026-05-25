import Image from 'next/image';
import Link from 'next/link';

interface PhotoGalleryProps {
  photos: Array<{
    id: string;
    image_url: string;
    alt: string;
    title?: string;
    comuna?: string;
    photographer?: string; // Nombre del fotógrafo para créditos
    description?: string; // Descripción opcional de la foto
  }>;
  variant?: 'grid' | 'masonry' | 'hero';
}

export default function PhotoGallery({ photos, variant = 'grid' }: PhotoGalleryProps) {
  if (variant === 'hero' && photos[0]) {
    return (
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden shadow-md">
        <Image
          src={photos[0].image_url}
          alt={photos[0].alt}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/45 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-white text-body-lg font-bold leading-tight drop-shadow">{photos[0].title || 'Miradas de Ñuble'}</p>
              {photos[0].description && (
                <p className="text-white/80 text-label-md mt-1 italic drop-shadow-sm max-w-xl">
                  "{photos[0].description}"
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
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      {photos.map((photo, i) => (
        <Link
          key={photo.id}
          href={`/fotos/${photo.id}`}
          className="relative overflow-hidden aspect-square"
        >
          <Image
            src={photo.image_url}
            alt={photo.alt}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
      ))}
    </div>
  );
}
