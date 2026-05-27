'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/utils';

interface UseApiOptions<T> {
  url: string;
  fallbackData?: T;
  immediate?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApi<T>({ url, fallbackData, immediate = true }: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(fallbackData ?? null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const apiUrl = getApiUrl();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}${url}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json.data || json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      if (fallbackData) {
        setData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, url, fallbackData]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseMutationReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  mutate: (body?: unknown) => Promise<T | null>;
}

export function useMutation<T>(url: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): UseMutationReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const apiUrl = getApiUrl();

  const mutate = async (body?: unknown): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      return json;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, mutate };
}
