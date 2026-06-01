import Link from 'next/link';
import { NewsItem } from '@/lib/types';

interface ReportajeHeroProps {
  reportaje: NewsItem;
}

export default function ReportajeHero({ reportaje }: ReportajeHeroProps) {
  return (
    <div>
      <h3 className="text-headline-sm md:text-headline-md font-headline-md mb-2 md:mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary text-[24px]">auto_stories</span>
        Reportajes
      </h3>
      <Link href={`/noticia/${reportaje.slug}`} className="block">
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group cursor-pointer shadow-lg">
          {/* Imagen de fondo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reportaje.image_url}
            alt={reportaje.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />

          {/* Degradado oscuro */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Contenido inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-10">
            <h2 className="text-white text-headline-sm md:text-headline-lg font-headline-md leading-tight line-clamp-2 md:line-clamp-3 drop-shadow-lg">
              {reportaje.title}
            </h2>
            {reportaje.summary && (
              <p className="text-white/80 text-body-md mt-2 line-clamp-2 max-w-2xl drop-shadow-sm hidden md:block">
                {reportaje.summary}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 md:mt-3">
              <span className="text-white/60 text-label-sm font-label-sm items-center gap-1 hidden md:flex">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                {new Date(reportaje.published_at).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            {reportaje.source_name && (
              <>
                <span className="text-white/40 hidden md:inline">&bull;</span>
                <span className="text-white/60 text-label-sm font-label-sm hidden md:inline">
                    {reportaje.source_name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Icono de lectura */}
          <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10">
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-label-sm font-bold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full group-hover:bg-white/30 transition-colors">
              Leer
              <span className="material-symbols-outlined text-[14px] md:text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
