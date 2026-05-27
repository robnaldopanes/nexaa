'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PhotoItem } from '@/lib/types';

interface UsePhotosOptions {
  approved?: boolean;
  featured?: boolean;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

interface UsePhotosReturn {
  photos: PhotoItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePhotos({
  approved = true,
  featured,
  limit = 20,
  orderBy = 'created_at',
  ascending = false,
}: UsePhotosOptions = {}): UsePhotosReturn {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('photos')
        .select('*')
        .order(orderBy, { ascending })
        .limit(limit);

      if (approved) {
        query = query.eq('is_approved', true);
      }
      if (featured !== undefined) {
        query = query.eq('is_featured', featured);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setPhotos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching photos'));
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [approved, featured, limit, orderBy, ascending]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return { photos, loading, error, refetch: fetchPhotos };
}
