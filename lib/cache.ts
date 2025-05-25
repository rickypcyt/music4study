interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>>;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(defaultTTL = 1000 * 60 * 60) { // 1 hour default TTL
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = null;
    this.startCleanup();
  }

  private startCleanup() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 1000 * 60 * 5);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }

  // Specific methods for embed caching
  getEmbed(url: string): string | undefined {
    return this.get<string>(`embed:${url}`);
  }

  setEmbed(url: string, html: string, ttl: number = this.defaultTTL): void {
    this.set(`embed:${url}`, html, ttl);
  }

  // Cleanup on destroy
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Create a singleton instance
const cache = new Cache();

export { cache, Cache }; 