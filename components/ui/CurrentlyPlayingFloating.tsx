'use client';

import { Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { youtubeCache } from '@/lib/youtubeCache';
import { useAudio } from '@/contexts/AudioContext';
import { useIframeTarget } from '@/contexts/IframeTargetContext';

export default function CurrentlyPlayingFloating() {
  const {
    isPlaying,
    currentVideoId,
    playVideo,
    pauseVideo,
    volume,
    setVolume,
    mute,
    unMute,
    isMuted
  } = useAudio();

  const { registerTarget, unregisterTarget, CURRENTLY_PLAYING_MODAL_KEY } = useIframeTarget();
  const modalSlotRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{ title: string; channelTitle: string } | null>(null);

  // Registrar el slot del modal para que el reproductor global se muestre aquí cuando el modal está abierto
  useLayoutEffect(() => {
    if (isModalOpen && currentVideoId && modalSlotRef.current) {
      registerTarget(CURRENTLY_PLAYING_MODAL_KEY, modalSlotRef.current);
      return () => unregisterTarget(CURRENTLY_PLAYING_MODAL_KEY);
    }
    unregisterTarget(CURRENTLY_PLAYING_MODAL_KEY);
  }, [isModalOpen, currentVideoId, registerTarget, unregisterTarget, CURRENTLY_PLAYING_MODAL_KEY]);

  // Avoid hydration mismatch: server has no localStorage, client may restore currentVideoId
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentVideoId) {
      setVideoInfo(null);
      return;
    }

    const fetchVideoInfo = async () => {
      const cached = youtubeCache.get(currentVideoId);
      if (cached) {
        setVideoInfo({
          title: cached.title,
          channelTitle: cached.channelTitle || ''
        });
        return;
      }

      const pendingRequest = youtubeCache.getPendingRequest(currentVideoId);
      if (pendingRequest) {
        try {
          const cached = await pendingRequest;
          if (cached) {
            setVideoInfo({
              title: cached.title,
              channelTitle: cached.channelTitle || ''
            });
          }
        } catch {
          // ignore
        }
        return;
      }

      const fetchPromise = (async () => {
        try {
          const response = await fetch(`/api/youtube-info?videoId=${currentVideoId}`);
          if (!response.ok) return null;
          const data = await response.json();
          if (data.title) {
            youtubeCache.set(currentVideoId, data.title, data.channelTitle || '');
            return {
              title: data.title,
              channelTitle: data.channelTitle || '',
              cachedAt: Date.now()
            };
          }
          return null;
        } catch (err) {
          console.warn('Error fetching video info:', err instanceof Error ? err.message : 'Unknown error');
          return null;
        }
      })();

      youtubeCache.setPendingRequest(currentVideoId, fetchPromise);
      const result = await fetchPromise;
      if (result) {
        setVideoInfo({
          title: result.title,
          channelTitle: result.channelTitle || ''
        });
      }
    };

    fetchVideoInfo();
  }, [currentVideoId]);

  const currentlyPlayingTitle = videoInfo?.title || (currentVideoId ? `Video ${currentVideoId}` : '');

  // Render only after mount so server and initial client output match (no localStorage on server)
  if (!mounted || !currentVideoId) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14 rounded-full p-0 shadow-lg bg-[#1a1814]/95 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/10 hover:border-[#e6e2d9]/30 md:h-16 md:w-16"
            aria-label="Currently playing"
          >
            <Music className="h-6 w-6 md:h-7 md:w-7" />
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 md:h-3.5 md:w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500 md:h-3.5 md:w-3.5" />
              </span>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1814] border-[#e6e2d9]/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#e6e2d9]">
              <Music className="w-5 h-5 shrink-0" />
              Currently Playing
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {currentlyPlayingTitle && currentVideoId && (
              <Card className="bg-[#1a1814] border-[#e6e2d9]/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg sm:text-xl line-clamp-2 mb-1 text-[#e6e2d9]">
                        {currentlyPlayingTitle}
                      </h3>
                      {videoInfo?.channelTitle && (
                        <p className="text-sm text-[#e6e2d9]/70">{videoInfo.channelTitle}</p>
                      )}
                    </div>
                    {/* Slot donde el reproductor global se muestra cuando el modal está abierto */}
                    <div
                      ref={modalSlotRef}
                      className="rounded-lg overflow-hidden border border-[#e6e2d9]/10 aspect-video relative bg-black min-h-[200px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#1a1814] border-[#e6e2d9]/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={isPlaying ? pauseVideo : () => playVideo(currentVideoId)}
                      className="h-12 w-12 shrink-0 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 border-[#e6e2d9]/20"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={isMuted ? unMute : mute}
                      className="h-12 w-12 shrink-0 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 border-[#e6e2d9]/20"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>

                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-24 sm:w-32 h-3 bg-[#e6e2d9]/10 rounded-lg appearance-none cursor-pointer border border-[#e6e2d9]/20 shrink-0"
                      />
                      <span className="text-sm font-medium text-[#e6e2d9]/70 min-w-[3ch]">{volume}%</span>
                    </div>
                  </div>

                  <div className="text-sm sm:text-base font-medium text-[#e6e2d9] shrink-0">
                    {isPlaying ? 'Playing' : 'Paused'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
