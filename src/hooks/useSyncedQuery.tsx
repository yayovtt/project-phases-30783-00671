import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';
import { useState, useEffect } from 'react';

interface UseSyncedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn' | 'initialData'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
}

export function useSyncedQuery<T>({ queryKey, queryFn, ...options }: UseSyncedQueryOptions<T>) {
  const cacheKey = queryKey.join(':');
  const [initialData, setInitialData] = useState<T | undefined>(undefined);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  // Load initial data from cache once
  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.get<T>(cacheKey);
      if (cached) {
        setInitialData(cached);
      }
      setHasLoadedCache(true);
    };
    loadFromCache();
  }, [cacheKey]);

  const query = useQuery<T>({
    queryKey,
    initialData,
    enabled: hasLoadedCache, // Only start querying after cache check
    queryFn: async () => {
      // Try to fetch from server
      try {
        const data = await queryFn();
        // Save to cache on successful fetch
        await offlineStorage.set(cacheKey, data);
        return data;
      } catch (error) {
        // If server fetch fails and we have initial data, use it
        if (initialData) {
          console.log('Using cached data for', cacheKey);
          return initialData;
        }
        throw error;
      }
    },
    ...options,
  });

  return query;
}
