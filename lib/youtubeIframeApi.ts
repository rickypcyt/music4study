/**
 * Load YouTube IFrame API script and resolve when YT.Player is available.
 * Safe to call multiple times; only loads once.
 */
let apiReady: Promise<typeof window.YT | null> | null = null;

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (videoId: string) => void;
  getVideoData: () => { video_id: string };
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
}

export function loadYouTubeAPI(): Promise<typeof window.YT | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiReady) return apiReady;

  apiReady = new Promise((resolve) => {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existing?.();
      if (window.YT) resolve(window.YT);
    };

    // Set a timeout in case the script fails to load
    const timeout = setTimeout(() => {
      console.warn('YouTube API loading timed out, this may be due to browser security policies');
      // Don't reject - let it continue silently
      resolve(null);
    }, 5000);

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    // Remove crossOrigin to avoid CORS issues
    // tag.crossOrigin = 'anonymous';
    // Add referrerpolicy for better privacy
    tag.referrerPolicy = 'no-referrer-when-downgrade';
    // Add error handling
    tag.onerror = () => {
      clearTimeout(timeout);
      console.warn('YouTube API script failed to load, falling back to iframe embed');
      // Don't reject - resolve with null to allow fallback
      resolve(null);
    };
    tag.onload = () => {
      // Clear timeout on successful load
      clearTimeout(timeout);
      // Give it a moment to initialize
      setTimeout(() => {
        if (window.YT?.Player) {
          resolve(window.YT);
        } else {
          console.warn('YouTube API loaded but not ready, falling back to iframe embed');
          resolve(null);
        }
      }, 1000);
    };
    
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(tag, first);
    
    // In case it was already loaded (e.g. cached)
    if (window.YT?.Player) {
      clearTimeout(timeout);
      resolve(window.YT);
    }
  });

  return apiReady;
}

export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
export const YT_ENDED = 0;
export const YT_UNSTARTED = -1;
export const YT_BUFFERING = 3;
export const YT_CUED = 5;
