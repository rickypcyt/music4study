'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentPlayingId: string | null;
  currentPlayingInfo: {
    linkId: string;
    videoId: string;
    title: string;
    url: string;
  } | null;
  setCurrentPlaying: (linkId: string | null, info?: { videoId: string; title: string; url: string }) => void;
  isPlaying: (linkId: string) => boolean;
  stopAll: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

// Clave para localStorage
const CURRENT_PLAYING_KEY = 'm4s_current_playing';

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  // Inicializar estado desde localStorage si existe
  const [currentPlayingInfo, setCurrentPlayingInfo] = useState<{
    linkId: string;
    videoId: string;
    title: string;
    url: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CURRENT_PLAYING_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate that all required fields exist and are strings
          if (parsed &&
              typeof parsed.linkId === 'string' &&
              typeof parsed.videoId === 'string' &&
              typeof parsed.title === 'string' &&
              typeof parsed.url === 'string') {
            return parsed;
          }
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Persistir cambios en localStorage
  useEffect(() => {
    try {
      if (currentPlayingInfo) {
        localStorage.setItem(CURRENT_PLAYING_KEY, JSON.stringify(currentPlayingInfo));
      } else {
        localStorage.removeItem(CURRENT_PLAYING_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist playing state:', error);
    }
  }, [currentPlayingInfo]);

  const setCurrentPlaying = (linkId: string | null, info?: { videoId: string; title: string; url: string }) => {
    if (linkId && info) {
      setCurrentPlayingInfo({
        linkId,
        videoId: info.videoId,
        title: info.title,
        url: info.url
      });
    } else {
      setCurrentPlayingInfo(null);
    }
  };

  const isPlaying = (linkId: string): boolean => {
    return currentPlayingInfo?.linkId === linkId;
  };

  const stopAll = () => {
    setCurrentPlayingInfo(null);
  };

  return (
    <VideoPlayerContext.Provider value={{
      currentPlayingId: currentPlayingInfo?.linkId || null,
      currentPlayingInfo,
      setCurrentPlaying,
      isPlaying,
      stopAll
    }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (context === undefined) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
}
