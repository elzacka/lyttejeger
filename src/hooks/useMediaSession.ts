/**
 * Media Session API hook for lock screen controls
 * Handles metadata, action handlers, and position state
 */

import { useEffect } from 'react';
import type { PlayingEpisode } from '../components/AudioPlayer';
import type { PlaybackSpeed } from './useAudioPlayer';

interface UseMediaSessionOptions {
  episode: PlayingEpisode | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
}

export function useMediaSession({
  episode,
  duration,
  currentTime,
  isPlaying,
  playbackSpeed,
  audioRef,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
}: UseMediaSessionOptions): void {
  // Set metadata with artwork
  useEffect(() => {
    if (!episode || !('mediaSession' in navigator)) return;

    const imageUrl = episode.imageUrl || episode.podcastImage;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: episode.title,
        artist: episode.podcastTitle || '',
        album: episode.podcastTitle || 'Lyttejeger',
        artwork: imageUrl
          ? [
              { src: imageUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: imageUrl, sizes: '128x128', type: 'image/jpeg' },
              { src: imageUrl, sizes: '192x192', type: 'image/jpeg' },
              { src: imageUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: imageUrl, sizes: '384x384', type: 'image/jpeg' },
              { src: imageUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
    } catch (error) {
      console.error('Failed to set media metadata:', error);
    }

    // Set up action handlers
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (!audio) return;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              onPlay();
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
              }
            })
            .catch((error) => {
              console.error('Media Session play failed:', error);
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
              }
            });
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        onPause();

        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', onSeekBackward);
      navigator.mediaSession.setActionHandler('seekforward', onSeekForward);

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const audio = audioRef.current;
        if (!audio || details.seekTime === undefined) return;
        audio.currentTime = details.seekTime;
      });
    } catch (error) {
      console.error('Failed to set media session action handlers:', error);
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [episode, audioRef, onPlay, onPause, onSeekBackward, onSeekForward]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: playbackSpeed,
        position: currentTime,
      });
    } catch {
      // setPositionState may not be supported
    }
  }, [currentTime, duration, playbackSpeed]);
}
