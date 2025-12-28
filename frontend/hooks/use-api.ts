/**
 * Custom React Hooks for API calls
 *
 * Benefits:
 * - Cleaner component code
 * - Reusable logic
 * - Built-in loading/error states
 * - Automatic cleanup
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * Generic hook for GET requests with loading/error states
 */
export function useApi<T>(
  path: string | null,
  options?: RequestInit
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<T>(path, options);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [path, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for videos list
 */
export function useVideos(params?: {
  page?: number;
  limit?: number;
  category?: string;
  sort?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.category) queryParams.set('category', params.category);
  if (params?.sort) queryParams.set('sort', params.sort);

  const path = `/api/videos${queryParams.toString() ? `?${queryParams}` : ''}`;

  return useApi<{
    success: boolean;
    data: {
      videos: any[];
      pagination: any;
    };
  }>(path);
}

/**
 * Hook for single video
 */
export function useVideo(id: number | null) {
  const path = id ? `/api/videos/${id}` : null;

  return useApi<{
    success: boolean;
    data: {
      video: any;
      relatedVideos: any[];
    };
  }>(path);
}

/**
 * Hook for categories
 */
export function useCategories() {
  return useApi<{
    success: boolean;
    data: {
      categories: any[];
    };
  }>('/api/categories');
}

/**
 * Hook for ads
 */
export function useAds(placement?: string, enabled?: boolean) {
  const queryParams = new URLSearchParams();
  if (placement) queryParams.set('placement', placement);
  if (enabled !== undefined) queryParams.set('enabled', enabled.toString());

  const path = `/api/ads${queryParams.toString() ? `?${queryParams}` : ''}`;

  return useApi<{
    success: boolean;
    data: {
      ads: any[];
    };
  }>(path);
}

/**
 * Hook for mutations (POST, PUT, DELETE) with loading/error states
 */
export function useMutation<TData = any, TVariables = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (
      path: string,
      variables?: TVariables,
      options?: RequestInit & { method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH' }
    ) => {
      try {
        setLoading(true);
        setError(null);

        let result: TData;
        const method = options?.method || 'POST';

        switch (method) {
          case 'POST':
            result = await apiClient.post<TData>(path, variables, options);
            break;
          case 'PUT':
            result = await apiClient.put<TData>(path, variables, options);
            break;
          case 'DELETE':
            result = await apiClient.delete<TData>(path, options);
            break;
          case 'PATCH':
            result = await apiClient.patch<TData>(path, variables, options);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}
