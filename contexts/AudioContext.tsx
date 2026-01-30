'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentVideoId: string | null;
  volume: number;
  isMuted: boolean;
  iframeOwner: string | null;
}

interface AudioContextType extends AudioState {
  playVideo: (videoId: string) => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  // Nuevo: control del iframe global
  iframeOwner: string | null;
  setIframeOwner: (ownerId: string | null) => void;
}

const AUDIO_STORAGE_KEY = 'music4study_audio_state';

const AudioContext = createContext<AudioContextType | null>(null);

const getStoredAudioState = (): AudioState => {
  if (typeof window === 'undefined') {
    return { isPlaying: false, currentVideoId: null, volume: 70, isMuted: false, iframeOwner: null };
  }

  try {
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isPlaying: parsed.isPlaying || false,
        currentVideoId: parsed.currentVideoId || null,
        volume: parsed.volume !== undefined ? parsed.volume : 70,
        isMuted: parsed.isMuted || false,
        iframeOwner: parsed.iframeOwner || null,
      };
    }
  } catch (error) {
    console.warn('Error reading audio state from localStorage:', error);
  }

  return { isPlaying: false, currentVideoId: null, volume: 70, isMuted: false, iframeOwner: null };
};

const saveAudioState = (state: AudioState) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Error saving audio state to localStorage:', error);
  }
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audioState, setAudioState] = useState<AudioState>(getStoredAudioState);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveAudioState(audioState);
  }, [audioState]);

  const playVideo = useCallback((videoId: string) => {
    setAudioState(prev => ({ ...prev, currentVideoId: videoId, isPlaying: true }));
  }, []);

  const pauseVideo = useCallback(() => {
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stopVideo = useCallback(() => {
    setAudioState(prev => ({ ...prev, currentVideoId: null, isPlaying: false }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setAudioState(prev => ({ ...prev, volume: Math.max(0, Math.min(100, volume)) }));
  }, []);

  const mute = useCallback(() => {
    setAudioState(prev => ({ ...prev, isMuted: true }));
  }, []);

  const unMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, isMuted: false }));
  }, []);

  const getCurrentTime = useCallback(() => {
    // This would need to be implemented with YouTube API or similar
    // For now, return 0 as a placeholder
    return 0;
  }, []);

  const getDuration = useCallback(() => {
    // This would need to be implemented with YouTube API or similar
    // For now, return 0 as a placeholder
    return 0;
  }, []);

  const setIframeOwner = useCallback((ownerId: string | null) => {
    setAudioState(prev => ({ ...prev, iframeOwner: ownerId }));
  }, []);

  return (
    <AudioContext.Provider value={{
      ...audioState,
      playVideo,
      pauseVideo,
      stopVideo,
      setVolume,
      mute,
      unMute,
      getCurrentTime,
      getDuration,
      setIframeOwner
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const context = useContext(AudioContext);

  // During SSR or before hydration, return safe defaults
  if (!context) {
    return {
      isPlaying: false,
      currentVideoId: null,
      volume: 70,
      isMuted: false,
      iframeOwner: null,
      playVideo: () => {},
      pauseVideo: () => {},
      stopVideo: () => {},
      setVolume: () => {},
      mute: () => {},
      unMute: () => {},
      getCurrentTime: () => 0,
      getDuration: () => 0,
      setIframeOwner: () => {}
    };
  }

  return context;
};