// Client-side cache for YouTube video info
// Uses localStorage with expiration to reduce API calls

interface CachedVideoInfo {
  title: string;
  channelTitle: string;
  cachedAt: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY_PREFIX = 'yt_video_info_';
const MAX_CACHE_SIZE = 500; // Maximum number of cached items to prevent excessive memory usage

// In-memory cache for request deduplication
const pendingRequests = new Map<string, Promise<CachedVideoInfo | null>>();

export const youtubeCache = {
  /**
   * Get cached video info from localStorage
   */
  get: (videoId: string): CachedVideoInfo | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${videoId}`);
      if (!cached) return null;

      const data: CachedVideoInfo = JSON.parse(cached);
      const age = Date.now() - data.cachedAt;

      // Check if cache is still valid
      if (age < CACHE_DURATION) {
        return data;
      }

      // Cache expired, remove it
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${videoId}`);
      return null;
    } catch (error) {
      console.warn('Error reading YouTube cache:', error);
      return null;
    }
  },

  /**
   * Set video info in cache
   */
  set: (videoId: string, title: string, channelTitle: string): void => {
    if (typeof window === 'undefined') return;

    try {
      // Check cache size and clean up if needed
      const currentSize = youtubeCache.getSize();
      if (currentSize >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries
        youtubeCache.cleanupOldest(Math.floor(MAX_CACHE_SIZE * 0.2));
      }

      const data: CachedVideoInfo = {
        title,
        channelTitle,
        cachedAt: Date.now(),
      };
      localStorage.setItem(`${CACHE_KEY_PREFIX}${videoId}`, JSON.stringify(data));
    } catch (error) {
      // localStorage might be full, try to clean up old entries
      console.warn('Error writing YouTube cache:', error);
      youtubeCache.cleanup();
    }
  },

  /**
   * Check if we have a pending request for this video (request deduplication)
   */
  getPendingRequest: (videoId: string): Promise<CachedVideoInfo | null> | null => {
    return pendingRequests.get(videoId) || null;
  },

  /**
   * Set a pending request to avoid duplicate API calls
   */
  setPendingRequest: (videoId: string, promise: Promise<CachedVideoInfo | null>): void => {
    pendingRequests.set(videoId, promise);
    // Clean up after request completes
    promise.finally(() => {
      pendingRequests.delete(videoId);
    });
  },

  /**
   * Clean up expired cache entries and old pending requests
   */
  cleanup: (): void => {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const data: CachedVideoInfo = JSON.parse(cached);
              const age = Date.now() - data.cachedAt;
              if (age >= CACHE_DURATION) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Invalid cache entry, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} expired YouTube cache entries`);
      }
    } catch (error) {
      console.warn('Error cleaning YouTube cache:', error);
    }
  },

  /**
   * Get current cache size
   */
  getSize: (): number => {
    if (typeof window === 'undefined') return 0;

    try {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  },

  /**
   * Clean up oldest cache entries
   */
  cleanupOldest: (count: number): void => {
    if (typeof window === 'undefined') return;

    try {
      const entries: Array<{ key: string; cachedAt: number }> = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const data: CachedVideoInfo = JSON.parse(cached);
              entries.push({ key, cachedAt: data.cachedAt });
            }
          } catch {
            // Invalid entry, remove it
            if (key) localStorage.removeItem(key);
          }
        }
      }

      // Sort by cachedAt (oldest first) and remove the oldest ones
      entries.sort((a, b) => a.cachedAt - b.cachedAt);
      entries.slice(0, count).forEach(entry => {
        localStorage.removeItem(entry.key);
      });
    } catch (error) {
      console.warn('Error cleaning up oldest cache entries:', error);
    }
  },

  /**
   * Clear all YouTube cache
   */
  clear: (): void => {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      pendingRequests.clear();
    } catch (error) {
      console.warn('Error clearing YouTube cache:', error);
    }
  },
};

// Clean up expired entries on module load (client-side only)
if (typeof window !== 'undefined') {
  // Run cleanup after a short delay to not block initial render
  setTimeout(() => youtubeCache.cleanup(), 1000);
}

