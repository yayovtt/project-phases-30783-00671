import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';

interface UseSyncedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
}

export function useSyncedQuery<T>({ queryKey, queryFn, ...options }: UseSyncedQueryOptions<T>): UseQueryResult<T> {
  const cacheKey = queryKey.join(':');

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      try {
        // Try server first
        const data = await queryFn();
        // Save to cache in background
        offlineStorage.set(cacheKey, data).catch(console.error);
        return data;
      } catch (error) {
        // On error, try cache
        const cached = await offlineStorage.get<T>(cacheKey);
        if (cached) return cached;
        throw error;
      }
    },
    ...options,
  });
}
