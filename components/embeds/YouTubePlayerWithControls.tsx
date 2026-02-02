'use client';

import '@/lib/suppressConsoleWarnings';

import { YT_ENDED, YT_PLAYING, loadYouTubeAPI } from '@/lib/youtubeIframeApi';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { YTPlayer } from '@/lib/youtubeIframeApi';
import { useAudio } from '@/contexts/AudioContext';

interface YouTubePlayerWithControlsProps {
  videoId: string;
  className?: string;
  compact?: boolean; // Para usar dentro del card
  useNativeControls?: boolean; // Usar controles nativos de YouTube
}

export default function YouTubePlayerWithControls({ 
  videoId, 
  className = '',
  compact = false,
  useNativeControls = false
}: YouTubePlayerWithControlsProps) {
  const { 
    volume, 
    isMuted, 
    setVolume, 
    mute, 
    unMute,
    pauseVideo,
    playVideo
  } = useAudio();

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Formatear tiempo en mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Actualizar el progreso del video
  const startProgressUpdate = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && isPlayerPlaying) {
        try {
          const time = playerRef.current.getCurrentTime();
          const videoDuration = playerRef.current.getDuration();
          setCurrentTime(time);
          setDuration(videoDuration);
        } catch {
          // Ignorar errores si el player no está listo
        }
      }
    }, 1000);
  }, [isPlayerPlaying]);

  const stopProgressUpdate = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Inicializar el reproductor de YouTube
  useEffect(() => {
    if (!playerContainerRef.current || !videoId) return;

    let cancelled = false;

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !YT?.Player || !playerContainerRef.current) {
          console.warn('YouTube API not available, video will not play');
          return;
        }

        const player = new YT.Player(playerContainerRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: useNativeControls ? 1 : 0, // Usar controles nativos si se solicita
            disablekb: useNativeControls ? 0 : 1, // Permitir teclado si hay controles nativos
            enablejsapi: 1,
            // Add additional parameters to reduce cookie/CORS issues
            origin: window.location.origin,
            widget_referrer: window.location.href,
          },
          events: {
            onReady() {
              if (cancelled) return;
              playerRef.current = player as YTPlayer;
              setIsReady(true);
              setIsLoading(false);
              
              // Establecer volumen inicial
              try {
                player.setVolume(volume);
                if (isMuted) {
                  player.mute();
                }
              } catch {
                console.warn('Error setting initial volume');
              }
            },
            onStateChange(event: { data: number }) {
              if (cancelled) return;
              
              const state = event.data;
              setIsPlayerPlaying(state === YT_PLAYING);
              
              if (state === YT_PLAYING) {
                startProgressUpdate();
              } else {
                stopProgressUpdate();
              }
              
              if (state === YT_ENDED) {
                setCurrentTime(0);
                setIsPlayerPlaying(false);
              }
            },
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('YouTube API not available, falling back to basic functionality:', err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      stopProgressUpdate();
      if (playerRef.current) {
        try {
          (playerRef.current as YTPlayer & { destroy?: () => void }).destroy?.();
        } catch {
          // Ignorar errores al destruir
        }
        playerRef.current = null;
      }
    };
  }, [videoId, volume, isMuted, useNativeControls, startProgressUpdate, stopProgressUpdate]);

  // Sincronizar volumen con el contexto
  useEffect(() => {
    if (playerRef.current && isReady) {
      try {
        if (isMuted) {
          playerRef.current.setVolume(0);
          playerRef.current.mute();
        } else {
          playerRef.current.setVolume(volume);
          playerRef.current.unMute();
        }
      } catch {
        // Ignorar si el player no está listo
      }
    }
  }, [volume, isMuted, isReady]);

  // Control de reproducción
  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !isReady) return;

    if (isPlayerPlaying) {
      playerRef.current.pauseVideo();
      pauseVideo();
    } else {
      playerRef.current.playVideo();
      playVideo(videoId);
    }
  }, [isPlayerPlaying, isReady, videoId, pauseVideo, playVideo]);

  // Control de volumen
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      unMute();
    }
  }, [setVolume, isMuted, unMute]);

  // Control de mute
  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      unMute();
    } else {
      mute();
    }
  }, [isMuted, mute, unMute]);

  // Control de tiempo (seek)
  const handleSeek = useCallback((newTime: number) => {
    if (playerRef.current && isReady) {
      try {
        playerRef.current.seekTo(newTime, true);
        setCurrentTime(newTime);
      } catch {
        console.warn('Error seeking video');
      }
    }
  }, [isReady]);

  // Calcular progreso
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Si es compacto y usa controles nativos, mostrar solo el video
  if (compact && useNativeControls) {
    return (
      <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}>
        {/* Contenedor del video */}
        <div className="relative aspect-video">
          <div ref={playerContainerRef} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si es compacto, mostrar controles más pequeños
  if (compact) {
    return (
      <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}>
        {/* Contenedor del video */}
        <div className="relative aspect-video">
          <div ref={playerContainerRef} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Controles compactos superpuestos */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            {/* Barra de progreso */}
            <div className="mb-2">
              <div className="relative h-0.5 bg-white/20 rounded-full cursor-pointer group"
                   onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left;
                     const percentage = x / rect.width;
                     handleSeek(percentage * duration);
                   }}>
                <div 
                  className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-white text-xs">
              {/* Tiempo */}
              <div className="text-xs font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                >
                  {isPlayerPlaying ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Volumen */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMuteToggle}
                    className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                      </svg>
                    )}
                  </button>
                  
                  <div className="relative w-12 h-0.5 bg-white/20 rounded-full cursor-pointer group"
                       onClick={(e) => {
                         e.stopPropagation();
                         const rect = e.currentTarget.getBoundingClientRect();
                         const x = e.clientX - rect.left;
                         const percentage = Math.max(0, Math.min(1, x / rect.width));
                         handleVolumeChange(percentage * 100);
                       }}>
                    <div 
                      className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                      style={{ width: `${isMuted ? 0 : volume}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Versión original (no compacta)
  return (
    <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Contenedor del video */}
      <div className="relative aspect-video">
        <div ref={playerContainerRef} className="w-full h-full" />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controles personalizados */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Barra de progreso */}
        <div className="mb-3">
          <div className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const percentage = x / rect.width;
                 handleSeek(percentage * duration);
               }}>
            <div 
              className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translateX(-50%) translateY(-50%)' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-white">
          {/* Tiempo actual / duración */}
          <div className="text-xs font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex items-center gap-3">
            {/* Botón play/pause */}
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
            >
              {isPlayerPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Control de volumen */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
              
              <div className="relative w-20 h-1 bg-white/20 rounded-full cursor-pointer group"
                   onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left;
                     const percentage = Math.max(0, Math.min(1, x / rect.width));
                     handleVolumeChange(percentage * 100);
                   }}>
                <div 
                  className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${isMuted ? 0 : volume}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
