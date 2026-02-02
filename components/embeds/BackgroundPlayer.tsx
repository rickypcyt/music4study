'use client';

import '@/lib/suppressConsoleWarnings';

import { YT_PLAYING, loadYouTubeAPI } from '@/lib/youtubeIframeApi';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { YTPlayer } from '@/lib/youtubeIframeApi';
import { useAudio } from '@/contexts/AudioContext';
import { useIframeTarget } from '@/contexts/IframeTargetContext';

/**
 * Single YouTube player (YT.Player). We manage the container div with the DOM API
 * (appendChild/removeChild) so React never tries to remove a node that YouTube or
 * a container change has altered — avoiding "removeChild: not a child" errors.
 * We resolve the container in useLayoutEffect so the card's slot (registered in
 * LazyYouTubeEmbed's useLayoutEffect) is already available — avoids blank video.
 */
export default function GlobalYouTubePlayer() {
  const { currentVideoId, isPlaying, iframeOwner, registerPlayer, syncPlaying, registerRelocatePlayerToGlobal } = useAudio();
  const { getTarget, GLOBAL_KEY, CURRENTLY_PLAYING_MODAL_KEY } = useIframeTarget();
  const playerDivRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const currentContainerRef = useRef<HTMLElement | null>(null);
  const resolvedContainerRef = useRef<HTMLElement | null>(null);
  const [containerVersion, setContainerVersion] = useState(0);

  // When owner card unmounts (e.g. pagination), LazyYouTubeEmbed cleanup calls relocatePlayerToGlobal
  // so we move the player div to the global container before React removes the card's DOM.
  useEffect(() => {
    registerRelocatePlayerToGlobal(() => {
      const global = getTarget(GLOBAL_KEY);
      const div = playerDivRef.current;
      if (global && div) {
        if (div.parentNode) {
          try {
            div.parentNode.removeChild(div);
          } catch {
            // ignore
          }
        }
        currentContainerRef.current = global;
        global.appendChild(div);
      }
    });
    return () => registerRelocatePlayerToGlobal(() => {});
  }, [registerRelocatePlayerToGlobal, getTarget, GLOBAL_KEY]);

  // Resolve container: modal slot (Currently Playing) si está abierto, sino card owner, sino global
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || !currentVideoId) {
      resolvedContainerRef.current = null;
      setContainerVersion((v) => v + 1);
      return;
    }
    const modalTarget = getTarget(CURRENTLY_PLAYING_MODAL_KEY);
    const ownerTarget = iframeOwner ? getTarget(iframeOwner) : null;
    const container = modalTarget ?? ownerTarget ?? getTarget(GLOBAL_KEY) ?? null;
    resolvedContainerRef.current = container;
    setContainerVersion((v) => v + 1);
  }, [currentVideoId, iframeOwner, getTarget, GLOBAL_KEY, CURRENTLY_PLAYING_MODAL_KEY]);

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

    const resolvedContainer = resolvedContainerRef.current;
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
        if (cancelled || !resolvedContainerRef.current || !currentVideoId || !YT?.Player) {
          console.warn('YouTube API not available for background player');
          return;
        }

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
            // Add additional parameters to reduce cookie/CORS issues
            origin: window.location.origin,
            widget_referrer: window.location.href,
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
        if (!cancelled) console.warn('YouTube API not available for background player:', err);
      });

    return () => {
      cancelled = true;
      // Don't destroy on container/video change — only when effect re-runs with no container/video
    };
  }, [currentVideoId, isPlaying, containerVersion, registerPlayer, syncPlaying]);

  // When container changes (e.g. card -> global), move the same div to the new container
  useEffect(() => {
    const resolvedContainer = resolvedContainerRef.current;
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
  }, [containerVersion, currentVideoId]);

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
