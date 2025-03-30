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