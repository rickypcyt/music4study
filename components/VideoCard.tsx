'use client';
import { useAudio } from '@/contexts/AudioContext';
import { useEffect, useState } from 'react';
import { extractYouTubeId } from './embeds/LazyYouTubeEmbed';
import Image from 'next/image';

interface VideoCardProps {
  videoId: string;
  title: string;
  thumbnail: string;
  url: string;
  className?: string;
}

export default function VideoCard({ videoId, title, thumbnail, url, className = '' }: VideoCardProps) {
  const {
    playVideo, pauseVideo, isPlaying, currentVideoId,
    volume, setVolume, getCurrentTime, getDuration, mute, unMute, isMuted
  } = useAudio();

  const isCurrentVideo = currentVideoId === videoId;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTube, setIsYouTube] = useState(false);

  useEffect(() => {
    const ytId = extractYouTubeId(url);
    setIsYouTube(!!ytId);
  }, [url]);

  // Update time every second if this is the current video
  useEffect(() => {
    if (isCurrentVideo && isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(getCurrentTime());
        setDuration(getDuration());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCurrentVideo, isPlaying, getCurrentTime, getDuration]);

  const handlePlay = () => {
    if (isYouTube) {
      playVideo(videoId);
    } else {
      // For non-YouTube videos, open in new tab
      window.open(url, '_blank');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    // We'll implement seek functionality
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-card rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      <div className="relative">
        <Image
          src={thumbnail}
          alt={title}
          width={400}
          height={192}
          className="w-full h-48 object-cover"
          loading="lazy"
        />

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isCurrentVideo && isPlaying
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-white hover:bg-gray-200'
            }`}
          >
            {isCurrentVideo && isPlaying ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Now playing indicator */}
        {isCurrentVideo && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
            🎵 Reproduciendo
          </div>
        )}

        {/* Time display */}
        {isCurrentVideo && duration > 0 && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>

        {/* Progress bar */}
        {isCurrentVideo && duration > 0 && (
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isCurrentVideo && (
              <>
                <button
                  onClick={pauseVideo}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                </button>

                <button
                  onClick={isMuted ? unMute : mute}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {isMuted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v4.21l2.5 2.5V12zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </>
            )}
          </div>

          {!isYouTube && (
            <button
              onClick={() => window.open(url, '_blank')}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Abrir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}