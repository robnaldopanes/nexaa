import { Metadata } from 'next';
import { NewsItem } from './types';
import { cleanEllipsis } from './utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://celebrated-commitment-production-737c.up.railway.app';
const SITE_NAME = 'NEXAA';

export function getAbsoluteUrl(path: string): string {
  const base = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getNewsUrl(slug: string): string {
  return getAbsoluteUrl(`/noticia/${slug}`);
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (!text) return '';
  const cleaned = cleanEllipsis(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '...';
}

export function getOgImageUrl(imageUrl: string | null | undefined): string {
  if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('googleusercontent.com') && !imageUrl.includes('placeholder')) {
    return imageUrl;
  }
  return getAbsoluteUrl('/images/icon-512.png');
}

export function generateNewsMetadata(news: NewsItem): Metadata {
  const title = news.title;
  const description = truncateText(news.summary || news.content, 150);
  const imageUrl = getOgImageUrl(news.image_url);
  const newsUrl = getNewsUrl(news.slug);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      url: newsUrl,
      type: 'article',
      publishedTime: news.published_at,
      siteName: SITE_NAME,
      locale: 'es_CL',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: newsUrl,
    },
  };
}

export function generateNewsSchema(news: NewsItem) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: news.title,
    description: truncateText(news.summary || news.content, 200),
    image: getOgImageUrl(news.image_url),
    datePublished: news.published_at,
    dateModified: news.published_at,
    author: {
      '@type': 'Organization',
      name: news.source_name || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: getAbsoluteUrl('/icon.png'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': getNewsUrl(news.slug),
    },
    keywords: news.tags?.join(', ') || news.category,
    articleSection: news.category,
    inLanguage: 'es-CL',
  };
}
