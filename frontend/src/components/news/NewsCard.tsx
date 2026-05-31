'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDate, getNewsImage, getCategoryIcon, isDataUrl } from '@/lib/utils';
import type { NewsItem } from '@/lib/types';

interface NewsCardProps {
  news: NewsItem;
  variant?: 'horizontal' | 'vertical' | 'featured';
}

function NewsImage({ src, alt, fill, className, sizes }: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
}) {
  const [error, setError] = useState(false);

  if (isDataUrl(src) || error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } : undefined} />
    );
  }
  return (
    <Image src={src} alt={alt} fill={fill} className={className} sizes={sizes} unoptimized onError={() => setError(true)} />
  );
}

export default function NewsCard({ news, variant = 'horizontal' }: NewsCardProps) {
  const imageUrl = getNewsImage(news.image_url, news.category);
  const hasImage = !!imageUrl;

  if (variant === 'featured') {
    return hasImage ? (
      <Link href={`/noticia/${news.slug}`} className="block relative aspect-[16/10] rounded-xl overflow-hidden shadow-lg card-press">
        <NewsImage
          src={imageUrl}
          alt={news.title}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          {news.is_breaking && (
            <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter mb-2 inline-block">
              Urgente
            </span>
          )}
          <h2 className="text-white text-headline-lg-mobile font-headline-lg-mobile leading-tight font-bold">
            {news.title}
          </h2>
          <p className="text-white/80 text-label-sm font-label-sm mt-1">
            {formatDate(news.published_at)} · {news.source_name}
          </p>
        </div>
      </Link>
    ) : (
      /* Branded Featured Fallback (Fondo Oscuro Premium NEXAA) */
      <Link href={`/noticia/${news.slug}`} className="block relative aspect-[16/10] rounded-xl overflow-hidden shadow-lg card-press bg-gradient-to-br from-[#121216] to-[#1e1e26] flex flex-col justify-between p-5 border border-outline-variant/20 hover:no-underline">
        <div className="absolute -right-6 -bottom-12 opacity-[0.03] text-[120px] font-bold font-headline select-none pointer-events-none">
          NEXAA
        </div>
        <div className="flex justify-between items-center w-full z-10">
          <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            NEXAA
          </span>
          <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">{getCategoryIcon(news.category)}</span>
            {news.category}
          </span>
        </div>
        <div className="z-10 mt-auto">
          {news.is_breaking && (
            <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter mb-2 inline-block">
              Urgente
            </span>
          )}
          <h2 className="text-primary text-headline-lg-mobile font-headline-lg-mobile leading-tight pr-4 font-bold tracking-tight">
            {news.title}
          </h2>
          <p className="text-on-surface-variant text-label-sm font-label-sm mt-2">
            {formatDate(news.published_at)} · {news.source_name}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/noticia/${news.slug}`} className="flex gap-4 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 shadow-sm card-press hover:no-underline text-inherit">
      <div className="flex-1 space-y-2 min-w-0">
        <span className="text-secondary text-label-sm font-label-sm uppercase flex items-center gap-1 font-bold">
          {news.comuna === 'Internacional' ? (
            <span className="bg-purple-100 text-purple-850 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
              🌎 Internacional
            </span>
          ) : news.comuna === 'Nacional' ? (
            <span className="bg-blue-100 text-blue-850 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
              🌐 Nacional
            </span>
          ) : (
            news.category
          )}
        </span>
        <h4 className="text-body-md font-bold text-on-surface leading-snug line-clamp-3">
          {news.title}
        </h4>
        <p className="text-on-surface-variant text-label-sm font-label-sm">
          {formatDate(news.published_at)}
        </p>
      </div>
      
      {hasImage ? (
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 relative bg-surface-container-high border border-outline-variant/20">
          <NewsImage
            src={imageUrl}
            alt={news.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      ) : (
        /* Branded Small Fallback (Fondo Oscuro Minimalista NEXAA) */
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 relative bg-gradient-to-br from-[#121215] to-[#1b1b22] flex flex-col items-center justify-center border border-outline-variant/20 shadow-sm">
          <div className="absolute top-1 left-1.5 opacity-25 text-[7px] uppercase tracking-widest font-bold text-white">
            NEXAA
          </div>
          <span className="material-symbols-outlined text-secondary/40 text-[26px]">
            {getCategoryIcon(news.category)}
          </span>
        </div>
      )}
    </Link>
  );
}
