import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';
import { useEffect } from 'react';

interface UseSyncedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
}

export function useSyncedQuery<T>({ queryKey, queryFn, ...options }: UseSyncedQueryOptions<T>) {
  const cacheKey = queryKey.join(':');

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => {
      // Try to fetch from server
      try {
        const data = await queryFn();
        // Save to cache on successful fetch
        await offlineStorage.set(cacheKey, data);
        return data;
      } catch (error) {
        // If server fetch fails, try to get from cache
        const cached = await offlineStorage.get<T>(cacheKey);
        if (cached) {
          console.log('Using cached data for', cacheKey);
          return cached;
        }
        throw error;
      }
    },
    ...options,
  });

  // Load initial data from cache
  useEffect(() => {
    const loadFromCache = async () => {
      if (!query.data) {
        const cached = await offlineStorage.get<T>(cacheKey);
        if (cached) {
          // This will be used as initial data
          query.refetch();
        }
      }
    };
    loadFromCache();
  }, [cacheKey]);

  return query;
}
