import { NewsItem, PhotoItem, AdSpace } from './types';

const CACHE_KEY = 'nexaa_home_cache';
const STALE_TTL = 30 * 60 * 1000; // 30 minutos
const HARD_TTL = 2 * 60 * 60 * 1000; // 2 horas

interface HomeCacheData {
  nationalFeatured: NewsItem | null;
  featuredNewsList: NewsItem[];
  latestNews: NewsItem[];
  moreNews: NewsItem[];
  photos: PhotoItem[];
  ads: AdSpace[];
  reportaje?: NewsItem | null;
  timestamp: number;
}

export function getCachedHomeData(): HomeCacheData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: HomeCacheData = JSON.parse(cached);

    // Si el caché es más viejo que HARD_TTL, descartar
    if (Date.now() - parsed.timestamp > HARD_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function setCachedHomeData(data: Omit<HomeCacheData, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage lleno o bloqueado, ignorar
  }
}

export function isCacheStale(cache: HomeCacheData): boolean {
  return Date.now() - cache.timestamp > STALE_TTL;
}
