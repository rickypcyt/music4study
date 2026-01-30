'use client';

import { ChevronLeft, ChevronRight, Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { youtubeCache } from '@/lib/youtubeCache';
import { useAudio } from '@/contexts/AudioContext';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  showCurrentlyPlaying?: boolean;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage,
  showCurrentlyPlaying = false
}: PaginationControlsProps) {
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{ title: string; channelTitle: string } | null>(null);

  // Fetch video info when currentVideoId changes
  useEffect(() => {
    if (!currentVideoId) {
      setVideoInfo(null);
      return;
    }

    const fetchVideoInfo = async () => {
      // Check cache first
      const cached = youtubeCache.get(currentVideoId);
      if (cached) {
        setVideoInfo({
          title: cached.title,
          channelTitle: cached.channelTitle || ''
        });
        return;
      }

      // Check if there's already a pending request
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
          // If pending request fails, continue to make new request
        }
        return;
      }

      // Create new fetch request
      const fetchPromise = (async () => {
        try {
          const response = await fetch(`/api/youtube-info?videoId=${currentVideoId}`);
          if (!response.ok) {
            return null;
          }
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

  // Create link object for currently playing video
  const currentlyPlayingLink = currentVideoId ? {
    id: `playing-${currentVideoId}`,
    title: videoInfo?.title || `YouTube Video ${currentVideoId}`,
    url: `https://www.youtube.com/watch?v=${currentVideoId}`,
    genre: 'Currently Playing',
    type: 'youtube',
    username: 'system',
    date_added: new Date().toISOString()
  } : null;



  if (totalPages <= 1 && !showCurrentlyPlaying) return null;

  const getVisiblePages = () => {
    const pages: number[] = [];
    
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col items-center space-y-2 py-2">
      <div className="flex items-center justify-end w-full max-w-4xl gap-4">
        {/* Pagination Controls - FIRST */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={currentPage === 1}
              className="bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {getVisiblePages().map((page) => (
                <Button
                  key={page}
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={
                    page === currentPage
                      ? "!bg-primary !hover:bg-primary/90 !text-primary-foreground !border-primary/50"
                      : "bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20"
                  }
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className="bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Currently Playing Button - ALL THE WAY TO THE RIGHT */}
        {showCurrentlyPlaying && currentVideoId && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 flex items-center gap-2"
              >
                <Music className="w-4 h-4" />
                Currently Playing
                {isPlaying && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1814] border-[#e6e2d9]/10">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#e6e2d9]">
                  <Music className="w-5 h-5" />
                  Currently Playing
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Currently Playing Video - ABOVE */}
                {currentlyPlayingLink && currentVideoId && (
                  <Card className="bg-[#1a1814] border-[#e6e2d9]/10 hover:shadow-lg hover:shadow-[#e6e2d9]/5 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-xl line-clamp-2 mb-2 text-[#e6e2d9]">
                              {currentlyPlayingLink.title}
                            </h3>
                            {videoInfo?.channelTitle && (
                              <p className="text-sm text-[#e6e2d9]/70 mb-2">
                                {videoInfo.channelTitle}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Thumbnail only — player stays in global container to avoid Radix ref/setState errors on dialog close */}
                        <div className="mt-4 rounded-lg overflow-hidden border border-[#e6e2d9]/10 shadow-lg aspect-video relative bg-[#e6e2d9]/5">
                          <Image
                            src={`https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`}
                            alt={currentlyPlayingLink.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Audio Controls - BELOW */}
                <Card className="bg-[#1a1814] border-[#e6e2d9]/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={isPlaying ? pauseVideo : () => playVideo(currentVideoId)}
                          className="h-12 w-12 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 border-[#e6e2d9]/20"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </Button>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={isMuted ? unMute : mute}
                            className="h-12 w-12 bg-[#e6e2d9]/10 hover:bg-[#e6e2d9]/20 text-[#e6e2d9] hover:text-indigo-400 border-[#e6e2d9]/20"
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </Button>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="w-32 h-3 bg-[#e6e2d9]/10 rounded-lg appearance-none cursor-pointer border border-[#e6e2d9]/20"
                            />
                            <span className="text-sm font-medium text-[#e6e2d9]/70 min-w-[3ch]">{volume}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-medium text-[#e6e2d9]">
                          {isPlaying ? 'Playing' : 'Paused'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
