'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NewsItem } from '@/lib/types';

interface UseNewsOptions {
  published?: boolean;
  approved?: boolean;
  featured?: boolean;
  breaking?: boolean;
  category?: string;
  comuna?: string;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

interface UseNewsReturn {
  news: NewsItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useNews({
  published = true,
  approved = true,
  featured,
  breaking,
  category,
  comuna,
  limit = 20,
  orderBy = 'published_at',
  ascending = false,
}: UseNewsOptions = {}): UseNewsReturn {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('news')
        .select('*')
        .order(orderBy, { ascending })
        .limit(limit);

      if (published) {
        query = query.eq('is_published', true);
      }
      if (approved) {
        query = query.eq('is_approved', true);
      }
      if (featured !== undefined) {
        query = query.eq('is_featured', featured);
      }
      if (breaking !== undefined) {
        query = query.eq('is_breaking', breaking);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (comuna) {
        query = query.eq('comuna', comuna);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setNews(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching news'));
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [published, approved, featured, breaking, category, comuna, limit, orderBy, ascending]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { news, loading, error, refetch: fetchNews };
}

interface UseNewsBySlugReturn {
  news: NewsItem | null;
  loading: boolean;
  error: Error | null;
}

export function useNewsBySlug(slug: string): UseNewsBySlugReturn {
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('news')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError || !data) {
          throw new Error('News not found');
        }

        setNews(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error fetching news'));
        setNews(null);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchNews();
    }
  }, [slug]);

  return { news, loading, error };
}
