/**
 * Load YouTube IFrame API script and resolve when YT.Player is available.
 * Safe to call multiple times; only loads once.
 */
let apiReady: Promise<typeof window.YT> | null = null;

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
}

export function loadYouTubeAPI(): Promise<typeof window.YT> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window undefined'));
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
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(tag, first);
    // In case it was already loaded (e.g. cached)
    if (window.YT?.Player) {
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
