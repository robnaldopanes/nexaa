import Link from 'next/link';
import { NewsItem } from '@/lib/types';

interface ReportajeHeroProps {
  reportaje: NewsItem;
}

export default function ReportajeHero({ reportaje }: ReportajeHeroProps) {
  return (
    <Link href={`/noticia/${reportaje.slug}`} className="block">
      <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden group cursor-pointer shadow-lg">
        {/* Imagen de fondo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={reportaje.image_url}
          alt={reportaje.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        {/* Degradado oscuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Badge REPORTAJE */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 bg-secondary text-on-secondary text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
            <span className="material-symbols-outlined text-[14px]">auto_stories</span>
            Reportajes
          </span>
        </div>

        {/* Contenido inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
          <h2 className="text-white text-headline-md md:text-headline-lg font-headline-md leading-tight line-clamp-3 drop-shadow-lg">
            {reportaje.title}
          </h2>
          {reportaje.summary && (
            <p className="text-white/80 text-body-md mt-2 line-clamp-2 max-w-2xl drop-shadow-sm">
              {reportaje.summary}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-white/60 text-label-sm font-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              {new Date(reportaje.published_at).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {reportaje.source_name && (
              <>
                <span className="text-white/40">&bull;</span>
                <span className="text-white/60 text-label-sm font-label-sm">
                  {reportaje.source_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Icono de lectura */}
        <div className="absolute bottom-5 right-5 md:bottom-8 md:right-8 z-10">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-label-sm font-label-sm px-4 py-2 rounded-full group-hover:bg-white/30 transition-colors">
            Leer reportaje
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
