import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';

interface UseSyncedMutationOptions<TData, TVariables> extends UseMutationOptions<TData, Error, TVariables> {
  cacheKeys?: string[];
}

export function useSyncedMutation<TData = unknown, TVariables = void>({
  cacheKeys = [],
  onSuccess,
  ...options
}: UseSyncedMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    ...options,
    onSuccess: async (data, variables, context) => {
      // Invalidate related cache keys
      for (const key of cacheKeys) {
        await offlineStorage.remove(key);
      }
      
      // Invalidate React Query cache
      for (const key of cacheKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      // Call original onSuccess if provided
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
  });
}
