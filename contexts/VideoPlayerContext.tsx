'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentPlayingId: string | null;
  setCurrentPlaying: (linkId: string | null) => void;
  isPlaying: (linkId: string) => boolean;
  stopAll: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const setCurrentPlaying = (linkId: string | null) => {
    setCurrentPlayingId(linkId);
  };

  const isPlaying = (linkId: string): boolean => {
    return currentPlayingId === linkId;
  };

  const stopAll = () => {
    setCurrentPlayingId(null);
  };

  return (
    <VideoPlayerContext.Provider value={{
      currentPlayingId,
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
