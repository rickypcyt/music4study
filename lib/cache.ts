type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheEntry<any>>;

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache for embed HTML content
const embedCache = new Map<string, string>();

export const cache = {
  // Get cached embed HTML
  getEmbed: (url: string): string | undefined => {
    return embedCache.get(url);
  },

  // Set embed HTML in cache
  setEmbed: (url: string, html: string): void => {
    embedCache.set(url, html);
  },

  // Clear the entire cache
  clear: (): void => {
    embedCache.clear();
  }
}; 