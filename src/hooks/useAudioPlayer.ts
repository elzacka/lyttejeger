/**
 * Core audio player hook - manages audio state and playback
 * Extracted from AudioPlayer.tsx for better separation of concerns
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { savePlaybackPosition, getPlaybackPosition } from '../services/db';
import type { PlayingEpisode } from '../components/AudioPlayer';

// Available playback speeds
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  audioError: boolean;
  playbackSpeed: PlaybackSpeed;
  audioKey: number;
  togglePlayPause: () => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  skipBackward: () => void;
  skipForward: () => void;
  cycleSpeed: () => void;
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<PlaybackSpeed>>;
  // Audio event handlers for the audio element
  audioEventHandlers: {
    onLoadStart: () => void;
    onLoadedMetadata: () => void;
    onTimeUpdate: () => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onWaiting: () => void;
    onCanPlay: () => void;
    onError: () => void;
  };
}

export function useAudioPlayer(episode: PlayingEpisode | null): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Track episode id for change detection
  const currentEpisodeIdRef = useRef<string | null>(null);
  // Track if we should auto-play when audio becomes ready
  const shouldAutoPlayRef = useRef(false);

  // Track last save time to debounce saves
  const lastSaveRef = useRef<number>(0);
  const saveIntervalRef = useRef<number | null>(null);

  // iOS 26 fix: Track when app was last visible and if we were playing
  const lastVisibleRef = useRef<number>(Date.now());
  const wasPlayingBeforeHiddenRef = useRef(false);
  // Counter to force audio element re-creation if needed
  const [audioKey, setAudioKey] = useState(0);

  // Handle episode changes - reset state and load audio
  useEffect(() => {
    const episodeId = episode?.id ?? null;

    if (episodeId === currentEpisodeIdRef.current) {
      return;
    }

    currentEpisodeIdRef.current = episodeId;

    if (episode && audioRef.current) {
      setIsLoading(true);
      setAudioError(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      shouldAutoPlayRef.current = true;
      audioRef.current.load();

      const loadPosition = async () => {
        try {
          const saved = await getPlaybackPosition(episode.id);
          if (saved && !saved.completed && audioRef.current) {
            audioRef.current.currentTime = saved.position;
            setCurrentTime(saved.position);
          }
        } catch {
          // Ignore position load errors
        }
      };

      loadPosition();
    } else {
      shouldAutoPlayRef.current = false;
    }
  }, [episode]);

  // Save playback position every 5 seconds while playing
  useEffect(() => {
    if (!episode || !isPlaying) {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      return;
    }

    saveIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSaveRef.current >= 5000 && audioRef.current) {
        lastSaveRef.current = now;
        savePlaybackPosition(
          episode.id,
          audioRef.current.currentTime,
          audioRef.current.duration || duration
        );
      }
    }, 1000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [episode, isPlaying, duration]);

  // Save position on unmount
  useEffect(() => {
    const audio = audioRef.current;
    const currentEpisode = episode;
    const currentDuration = duration;

    return () => {
      if (currentEpisode && audio) {
        savePlaybackPosition(
          currentEpisode.id,
          audio.currentTime,
          audio.duration || currentDuration
        );
      }
    };
  }, [episode, duration]);

  // Apply playback speed to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, episode?.id]);

  // Handle visibility change for iOS recovery
  useEffect(() => {
    if (!episode) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        lastVisibleRef.current = Date.now();
        wasPlayingBeforeHiddenRef.current = isPlaying;
      } else if (document.visibilityState === 'visible' && audioRef.current) {
        const audio = audioRef.current;
        const timeSinceHidden = Date.now() - lastVisibleRef.current;
        const wasPlaying = wasPlayingBeforeHiddenRef.current;

        setIsPlaying(!audio.paused);
        setCurrentTime(audio.currentTime);

        if (wasPlaying && audio.paused) {
          const savedPosition = audio.currentTime;
          let recovered = false;

          try {
            await audio.play();
            await new Promise((r) => setTimeout(r, 200));
            if (!audio.paused) {
              recovered = true;
              setIsPlaying(true);
            }
          } catch {
            // Continue to next strategy
          }

          if (!recovered) {
            try {
              audio.load();
              await new Promise<void>((resolve) => {
                const onCanPlay = () => {
                  audio.removeEventListener('canplay', onCanPlay);
                  resolve();
                };
                audio.addEventListener('canplay', onCanPlay, { once: true });
                setTimeout(resolve, 3000);
              });
              audio.currentTime = savedPosition;
              await audio.play();
              await new Promise((r) => setTimeout(r, 200));
              if (!audio.paused) {
                recovered = true;
                setIsPlaying(true);
              }
            } catch {
              // Continue to next strategy
            }
          }

          if (!recovered && timeSinceHidden > 30000) {
            setAudioKey((k) => k + 1);
            shouldAutoPlayRef.current = true;
          }

          if (!recovered) {
            setIsPlaying(false);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [episode, isPlaying]);

  // Audio event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setAudioError(false);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    if (episode && audioRef.current) {
      savePlaybackPosition(
        episode.id,
        audioRef.current.currentTime,
        audioRef.current.duration || duration
      );
    }
  }, [episode, duration]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (episode && audioRef.current) {
      savePlaybackPosition(episode.id, audioRef.current.duration, audioRef.current.duration);
    }
  }, [episode]);

  const handleWaiting = useCallback(() => setIsLoading(true), []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setAudioError(false);

    if (shouldAutoPlayRef.current && audioRef.current) {
      shouldAutoPlayRef.current = false;
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setIsPlaying(false);
    setAudioError(true);
    shouldAutoPlayRef.current = false;
  }, []);

  // Playback controls
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || audioError) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.error('Play failed:', error);
        audio.load();
        audio.play().catch(() => {
          setAudioError(true);
        });
      });
    }
  }, [isPlaying, audioError]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
    }
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((current) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(current);
      const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
      return PLAYBACK_SPEEDS[nextIndex];
    });
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    audioError,
    playbackSpeed,
    audioKey,
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward,
    cycleSpeed,
    setPlaybackSpeed,
    audioEventHandlers: {
      onLoadStart: handleLoadStart,
      onLoadedMetadata: handleLoadedMetadata,
      onTimeUpdate: handleTimeUpdate,
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded,
      onWaiting: handleWaiting,
      onCanPlay: handleCanPlay,
      onError: handleError,
    },
  };
}
