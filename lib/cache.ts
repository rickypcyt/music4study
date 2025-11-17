// Cache for embed HTML content with size limit
const embedCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100; // Limit to 100 cached embeds

export const cache = {
  // Get cached embed HTML
  getEmbed: (url: string): string | undefined => {
    return embedCache.get(url);
  },

  // Set embed HTML in cache with size limit
  setEmbed: (url: string, html: string): void => {
    // If cache is too large, remove oldest entries (first in Map)
    if (embedCache.size >= MAX_CACHE_SIZE) {
      const firstKey = embedCache.keys().next().value;
      if (firstKey) {
        embedCache.delete(firstKey);
      }
    }
    embedCache.set(url, html);
  },

  // Clear the entire cache
  clear: (): void => {
    embedCache.clear();
  }
}; 