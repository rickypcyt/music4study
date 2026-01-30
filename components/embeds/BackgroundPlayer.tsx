'use client';

import { useEffect, useRef } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useIframeTarget } from '@/contexts/IframeTargetContext';
import { loadYouTubeAPI, YT_PLAYING } from '@/lib/youtubeIframeApi';
import type { YTPlayer } from '@/lib/youtubeIframeApi';

/**
 * Single YouTube player (YT.Player). We manage the container div with the DOM API
 * (appendChild/removeChild) so React never tries to remove a node that YouTube or
 * a container change has altered — avoiding "removeChild: not a child" errors.
 */
export default function GlobalYouTubePlayer() {
  const { currentVideoId, isPlaying, iframeOwner, registerPlayer, syncPlaying } = useAudio();
  const { getTarget, GLOBAL_KEY } = useIframeTarget();
  const playerDivRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const currentContainerRef = useRef<HTMLElement | null>(null);

  const resolvedContainer =
    typeof document !== 'undefined' && currentVideoId
      ? (iframeOwner ? getTarget(iframeOwner) : null) ?? getTarget(GLOBAL_KEY)
      : null;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const moveDivTo = (container: HTMLElement) => {
      const div = playerDivRef.current;
      if (!div) return;
      if (currentContainerRef.current === container) return;
      // Remove from current parent (may already be gone if slot unmounted)
      if (div.parentNode) {
        try {
          div.parentNode.removeChild(div);
        } catch {
          // ignore
        }
      }
      currentContainerRef.current = container;
      container.appendChild(div);
    };

    const removeDivFromCurrent = () => {
      const div = playerDivRef.current;
      if (div?.parentNode) {
        try {
          div.parentNode.removeChild(div);
        } catch {
          // ignore if already removed
        }
      }
      currentContainerRef.current = null;
    };

    const destroyPlayer = () => {
      const p = playerInstanceRef.current;
      if (p) {
        try {
          (p as YTPlayer & { destroy?: () => void }).destroy?.();
        } catch {
          // ignore
        }
        playerInstanceRef.current = null;
        registerPlayer(null);
      }
      removeDivFromCurrent();
      if (playerDivRef.current) {
        playerDivRef.current = null;
      }
    };

    if (!resolvedContainer || !currentVideoId) {
      destroyPlayer();
      return;
    }

    let cancelled = false;

    if (!playerDivRef.current) {
      const div = document.createElement('div');
      div.className = 'absolute inset-0 w-full h-full border-0';
      div.style.minHeight = '1px';
      div.style.minWidth = '1px';
      playerDivRef.current = div;
    }

    moveDivTo(resolvedContainer);

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !resolvedContainer || !currentVideoId || !YT?.Player) return;

        const existing = playerInstanceRef.current;
        const div = playerDivRef.current;
        if (!div) return;

        if (existing) {
          try {
            const vid = existing.getVideoData?.();
            if (vid?.video_id !== currentVideoId) {
              existing.loadVideoById(currentVideoId);
              if (isPlaying) existing.playVideo();
            }
          } catch {
            // ignore
          }
          return;
        }

        const player = new YT.Player(div, {
          videoId: currentVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 0,
          },
          events: {
            onReady() {
              if (cancelled) return;
              playerInstanceRef.current = player as YTPlayer;
              registerPlayer(player as YTPlayer);
              if (isPlaying) (player as YTPlayer).playVideo();
            },
            onStateChange(event: { data: number }) {
              if (cancelled) return;
              syncPlaying(event.data === YT_PLAYING);
            },
          },
        });
      })
      .catch((err) => {
        if (!cancelled) console.warn('YouTube API load failed:', err);
      });

    return () => {
      cancelled = true;
      // Don't destroy on container/video change — only when effect re-runs with no container/video
    };
  }, [currentVideoId, isPlaying, resolvedContainer, registerPlayer, syncPlaying]);

  // When container changes (e.g. card -> global), move the same div to the new container
  useEffect(() => {
    if (!resolvedContainer || !currentVideoId) return;
    const div = playerDivRef.current;
    if (div && currentContainerRef.current !== resolvedContainer) {
      if (div.parentNode) {
        try {
          div.parentNode.removeChild(div);
        } catch {
          // ignore
        }
      }
      currentContainerRef.current = resolvedContainer;
      resolvedContainer.appendChild(div);
    }
  }, [resolvedContainer, currentVideoId]);

  // On unmount: destroy player and remove our div from DOM
  useEffect(() => {
    return () => {
      const p = playerInstanceRef.current;
      if (p) {
        try {
          (p as YTPlayer & { destroy?: () => void }).destroy?.();
        } catch {
          // ignore
        }
        playerInstanceRef.current = null;
        registerPlayer(null);
      }
      const div = playerDivRef.current;
      if (div?.parentNode) {
        try {
          div.parentNode.removeChild(div);
        } catch {
          // ignore
        }
      }
      currentContainerRef.current = null;
      playerDivRef.current = null;
    };
  }, [registerPlayer]);

  // Nothing for React to render — we own the DOM node
  return null;
}
