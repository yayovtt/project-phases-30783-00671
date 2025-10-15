import localforage from 'localforage';

// Initialize IndexedDB storage
const storage = localforage.createInstance({
  name: 'projectPhasesDB',
  storeName: 'appData',
});

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const offlineStorage = {
  // Generic get with cache validation
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await storage.getItem<CachedData<T>>(key);
      if (!cached) return null;
      
      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
      if (isExpired) {
        await storage.removeItem(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  },

  // Generic set with timestamp
  async set<T>(key: string, data: T): Promise<void> {
    try {
      await storage.setItem<CachedData<T>>(key, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  },

  // Remove specific item
  async remove(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  },

  // Clear all cache
  async clear(): Promise<void> {
    try {
      await storage.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  // Get all keys
  async keys(): Promise<string[]> {
    try {
      return await storage.keys();
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  },
};
