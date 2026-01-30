import { cache } from './cache';

interface EmbedData {
  html: string;
  type: 'youtube' | 'spotify' | 'soundcloud';
  url: string;
  loaded: boolean;
  error?: boolean;
  thumbnailUrl?: string;
}

class EmbedManager {
  private static instance: EmbedManager;
  private embedStates: Map<string, EmbedData>;
  private loadingPromises: Map<string, Promise<void>>;
  private preloadQueue: string[];
  private thumbnailCache: Map<string, string>;

  private constructor() {
    this.embedStates = new Map();
    this.loadingPromises = new Map();
    this.preloadQueue = [];
    this.thumbnailCache = new Map();
  }

  public static getInstance(): EmbedManager {
    if (!EmbedManager.instance) {
      EmbedManager.instance = new EmbedManager();
    }
    return EmbedManager.instance;
  }

  private getEmbedType(url: string): EmbedData['type'] {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('spotify.com')) return 'spotify';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    throw new Error('Unsupported embed type');
  }

  private async loadEmbed(url: string): Promise<void> {
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const loadPromise = (async () => {
      try {
        // Check cache first
        const cachedHtml = cache.getEmbed(url);
        if (cachedHtml) {
          this.embedStates.set(url, {
            html: cachedHtml,
            type: this.getEmbedType(url),
            url,
            loaded: true,
            thumbnailUrl: this.thumbnailCache.get(url)
          });
          return;
        }

        // If not in cache, fetch and process the embed
        const embedType = this.getEmbedType(url);
        let embedHtml: string;
        let thumbnailUrl: string | undefined;

        switch (embedType) {
          case 'youtube':
            const videoId = this.extractYouTubeId(url);
            // Use youtube-nocookie.com for better privacy and performance
            embedHtml = `<iframe
              src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1"
              class="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              importance="low"
              sandbox="allow-scripts allow-same-origin allow-presentation"
            ></iframe>`;
            thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            break;
          case 'spotify':
            const spotifyId = this.extractSpotifyId(url);
            embedHtml = `<iframe
              src="https://open.spotify.com/embed/${spotifyId}"
              class="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              importance="low"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
            ></iframe>`;
            break;
          case 'soundcloud':
            embedHtml = `<iframe 
              src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false" 
              class="w-full h-full" 
              scrolling="no" 
              frameBorder="no" 
              allow="autoplay"
              allowFullScreen
              loading="lazy"
              importance="low"
            ></iframe>`;
            break;
          default:
            throw new Error('Unsupported embed type');
        }

        // Cache the embed HTML and thumbnail
        cache.setEmbed(url, embedHtml);
        if (thumbnailUrl) {
          this.thumbnailCache.set(url, thumbnailUrl);
        }
        
        this.embedStates.set(url, {
          html: embedHtml,
          type: embedType,
          url,
          loaded: true,
          thumbnailUrl
        });

        // Preload thumbnail if available
        if (thumbnailUrl) {
          const img = new Image();
          img.src = thumbnailUrl;
        }
      } catch (error) {
        console.error(`Error loading embed for ${url}:`, error);
        this.embedStates.set(url, {
          html: '',
          type: this.getEmbedType(url),
          url,
          loaded: true,
          error: true
        });
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    await loadPromise;
    this.loadingPromises.delete(url);
  }

  private extractYouTubeId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    throw new Error('Invalid YouTube URL');
  }

  private extractSpotifyId(url: string): string {
    const parts = url.split('/');
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1].split('?')[0];
    return `${type}/${id}`;
  }

  public async getEmbed(url: string): Promise<EmbedData> {
    const existingState = this.embedStates.get(url);
    if (existingState?.loaded) {
      return existingState;
    }

    await this.loadEmbed(url);
    return this.embedStates.get(url)!;
  }

  public getThumbnailUrl(url: string): string | undefined {
    return this.thumbnailCache.get(url);
  }

  public preloadEmbed(url: string): void {
    if (!this.embedStates.has(url) && !this.loadingPromises.has(url)) {
      this.preloadQueue.push(url);
      this.processPreloadQueue();
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) return;

    const url = this.preloadQueue.shift();
    if (url) {
      // Use requestIdleCallback for non-critical preloading
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as { requestIdleCallback: (callback: IdleRequestCallback) => void }).requestIdleCallback(() => this.loadEmbed(url));
      } else if (typeof window !== 'undefined') {
        setTimeout(() => this.loadEmbed(url), 0);
      }
      this.processPreloadQueue();
    }
  }

  public clearCache(): void {
    this.embedStates.clear();
    this.loadingPromises.clear();
    this.preloadQueue = [];
    this.thumbnailCache.clear();
    cache.clear();
  }
}

export const embedManager = EmbedManager.getInstance(); 