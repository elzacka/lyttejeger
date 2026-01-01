import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  PodcastIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SpinnerIcon,
  ErrorIcon,
  CloseIcon,
  ChevronIcon,
  MoonIcon,
} from '@designsystem/core';
import type { Episode } from '../types/podcast';
import { savePlaybackPosition, getPlaybackPosition } from '../services/db';
import styles from './AudioPlayer.module.css';

/**
 * ============================================================================
 * iOS SAFARI AUDIO PLAYBACK - CRITICAL REQUIREMENTS
 * ============================================================================
 *
 * iOS Safari has strict requirements for audio playback. Violating ANY of these
 * will cause silent playback failures that are difficult to debug.
 *
 * REQUIREMENT 1: User Gesture Chain
 * ---------------------------------
 * audio.play() MUST be called synchronously within a user gesture (tap) context.
 * Adding ANY async operation between the tap and play() breaks this chain:
 *   - NO Promises or await before play()
 *   - NO setTimeout before play()
 *   - NO event listener callbacks before play()
 *
 * REQUIREMENT 2: Explicit Audio Initialization
 * --------------------------------------------
 * When the episode/source changes, you MUST:
 *   - Call audio.load() explicitly
 *   - Reset all state (isPlaying, currentTime, duration, etc.)
 *   - Do NOT rely solely on React's key={} remounting
 *
 * REQUIREMENT 3: Component Mounting
 * ---------------------------------
 * AudioPlayer MUST remain mounted at the same level in the component tree.
 *   - Render at root level in App.tsx (sibling to TopNav)
 *   - NEVER move inside conditional renders or view-specific components
 *   - Remounting the component loses the audio session
 *
 * ============================================================================
 */

// Swipe detection threshold in pixels
const SWIPE_THRESHOLD = 50;

export interface PlayingEpisode extends Episode {
  podcastTitle?: string;
  podcastImage?: string;
}

interface AudioPlayerProps {
  episode: PlayingEpisode | null;
  onClose: () => void;
}

// Available playback speeds
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// Sleep timer options (in minutes, 0 = off, -1 = end of episode)
const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'Av' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 time' },
  { value: -1, label: 'Slutten' },
] as const;

export function AudioPlayer({ episode, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null); // timestamp when timer expires

  // Track episode id for change detection
  const currentEpisodeIdRef = useRef<string | null>(null);
  // Track if we should auto-play when audio becomes ready
  const shouldAutoPlayRef = useRef(false);

  // Track last save time to debounce saves
  const lastSaveRef = useRef<number>(0);
  const saveIntervalRef = useRef<number | null>(null);

  // Handle episode changes - reset state and load audio
  // CRITICAL: This explicit initialization is required for iOS Safari.
  // DO NOT rely solely on key={episode.id} remounting - iOS needs explicit load() call.
  useEffect(() => {
    const episodeId = episode?.id ?? null;

    // If episode hasn't changed, do nothing
    if (episodeId === currentEpisodeIdRef.current) {
      return;
    }

    // Update ref
    currentEpisodeIdRef.current = episodeId;

    if (episode && audioRef.current) {
      // Reset state for new episode - REQUIRED for iOS
      // See CLAUDE.md "Audio Playback (iOS/Mobile) - CRITICAL" section
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      setAudioError(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      // New episode - mark for auto-play when audio becomes ready
      shouldAutoPlayRef.current = true;

      // Explicitly load the new source - REQUIRED for iOS
      // The key={episode.id} remount is not sufficient on iOS Safari
      audioRef.current.load();

      // Load saved position asynchronously
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

  // Media Session API - for lock screen controls and artwork
  useEffect(() => {
    if (!episode || !('mediaSession' in navigator)) return;

    const imageUrl = episode.imageUrl || episode.podcastImage;

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

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', async () => {
      if (!audioRef.current) return;
      try {
        await audioRef.current.play();
      } catch {
        try {
          audioRef.current.load();
          await audioRef.current.play();
        } catch {
          // Still failed - user needs to interact
        }
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
      }
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime !== undefined) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [episode, duration]);

  // Update Media Session playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state for lock screen progress bar
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: currentTime,
      });
    } catch {
      // setPositionState may not be supported
    }
  }, [currentTime, duration]);

  // Handle visibility change - sync UI with audio state
  useEffect(() => {
    if (!episode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        setIsPlaying(!audioRef.current.paused);
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [episode]);

  // Apply playback speed to audio element (also when episode changes since element remounts)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, episode?.id]);

  // Update Media Session with current playback rate
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

  // Sleep timer logic
  useEffect(() => {
    if (!sleepTimerEnd || !isPlaying) return;

    const checkTimer = () => {
      const now = Date.now();
      if (now >= sleepTimerEnd) {
        // Timer expired - pause playback
        audioRef.current?.pause();
        setSleepTimerEnd(null);
        setSleepTimerMinutes(0);
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd, isPlaying]);

  // Handle "end of episode" sleep timer
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setSleepTimerEnd(null);
    setSleepTimerMinutes(0);
    if (episode && audioRef.current) {
      savePlaybackPosition(episode.id, audioRef.current.duration, audioRef.current.duration);
    }
  }, [episode]);

  // Audio event handlers
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

  const handlePlay = useCallback(() => setIsPlaying(true), []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (episode && audioRef.current) {
      savePlaybackPosition(
        episode.id,
        audioRef.current.currentTime,
        audioRef.current.duration || duration
      );
    }
  }, [episode, duration]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setAudioError(false);
  }, []);

  const handleWaiting = useCallback(() => setIsLoading(true), []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setAudioError(false);

    // Auto-play if this is a new episode
    // NOTE: This will likely fail on iOS without user gesture - that's expected
    if (shouldAutoPlayRef.current && audioRef.current) {
      shouldAutoPlayRef.current = false;

      // Direct play attempt - no async wrapper to avoid iOS issues
      audioRef.current.play().catch(() => {
        // Autoplay blocked - this is expected on iOS/Safari without user gesture
        // The user will need to tap play manually
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

  // CRITICAL: iOS requires play() to be called synchronously within user gesture context.
  // DO NOT add async operations (Promises, awaits, setTimeout) between user tap and audio.play().
  // Breaking this chain will cause silent playback failure on iOS Safari.
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || audioError) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        // On iOS, we may need to load the audio first if it was suspended
        // IMPORTANT: Do NOT await or use promises here - must stay in user gesture context
        if (audio.readyState < 2) {
          audio.load();
        }
        await audio.play();
      } catch {
        // Play failed - try loading first
        try {
          audio.load();
          await audio.play();
        } catch {
          // Still failed - set error state
          setAudioError(true);
        }
      }
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

  // Keyboard shortcuts for playback control
  useEffect(() => {
    if (!episode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyM':
          // Mute/unmute (optional - could add volume control later)
          if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [episode, togglePlayPause, skipBackward, skipForward]);

  // Cycle through playback speeds
  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((current) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(current);
      const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
      return PLAYBACK_SPEEDS[nextIndex];
    });
  }, []);

  // Cycle through sleep timer options
  const cycleSleepTimer = useCallback(() => {
    const currentIndex = SLEEP_TIMER_OPTIONS.findIndex((opt) => opt.value === sleepTimerMinutes);
    const nextIndex = (currentIndex + 1) % SLEEP_TIMER_OPTIONS.length;
    const nextOption = SLEEP_TIMER_OPTIONS[nextIndex];

    setSleepTimerMinutes(nextOption.value);

    if (nextOption.value === 0) {
      // Timer off
      setSleepTimerEnd(null);
    } else if (nextOption.value === -1) {
      // End of episode - handled in handleEnded
      setSleepTimerEnd(null);
    } else {
      // Set timer for X minutes from now
      setSleepTimerEnd(Date.now() + nextOption.value * 60 * 1000);
    }
  }, [sleepTimerMinutes]);

  // Format remaining time for sleep timer display
  const formatSleepTimerRemaining = useCallback(() => {
    if (sleepTimerMinutes === 0) return null;
    if (sleepTimerMinutes === -1) return 'Slutten';
    if (!sleepTimerEnd) return null;

    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.ceil(remaining / 60000);
    return `${mins} min`;
  }, [sleepTimerMinutes, sleepTimerEnd]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleInfoClick = useCallback(() => {
    toggleExpanded();
  }, [toggleExpanded]);

  // Swipe gesture handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaY = touchStartRef.current.y - touch.clientY;
      const deltaX = Math.abs(touchStartRef.current.x - touch.clientX);

      // Only trigger swipe if vertical movement is dominant and exceeds threshold
      if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > deltaX) {
        if (deltaY > 0 && !isExpanded) {
          // Swipe up - expand
          setIsExpanded(true);
        } else if (deltaY < 0 && isExpanded) {
          // Swipe down - collapse
          setIsExpanded(false);
        }
      }

      touchStartRef.current = null;
    },
    [isExpanded]
  );

  const swipeHandlers = useMemo(
    () => ({
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    }),
    [handleTouchStart, handleTouchEnd]
  );

  // Don't render if no episode
  if (!episode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const imageUrl = episode.imageUrl || episode.podcastImage;

  return (
    <div
      className={`${styles.player} ${isExpanded ? styles.expanded : styles.collapsed}`}
      {...swipeHandlers}
    >
      <audio
        key={episode.id}
        ref={audioRef}
        src={episode.audioUrl}
        preload="auto"
        playsInline
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={handleError}
      />

      {/* Mini progress bar - visible in collapsed state */}
      <div className={styles.miniProgress} style={{ width: `${progress}%` }} aria-hidden="true" />

      <div className={styles.container}>
        {/* Swipe handle indicator */}
        <div className={styles.swipeHandle} aria-hidden="true" />
        {!isExpanded && (
          <span className={styles.swipeHint} aria-hidden="true">
            sveip opp
          </span>
        )}

        <div className={styles.contentRow}>
          {/* Episode info - on mobile collapsed: play/pause, otherwise: expand/collapse */}
          <button
            className={styles.info}
            onClick={handleInfoClick}
            aria-label={isExpanded ? 'Skjul kontroller' : 'Vis kontroller'}
            aria-expanded={isExpanded}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={episode.podcastTitle || episode.title}
                className={styles.image}
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className={`${styles.image} image-placeholder`}>
                <PodcastIcon size={32} aria-hidden="true" />
              </div>
            )}
            <div className={styles.text}>
              <p className={styles.title}>{episode.title}</p>
              {episode.podcastTitle && <p className={styles.podcast}>{episode.podcastTitle}</p>}
            </div>
            <ChevronIcon
              direction={isExpanded ? 'down' : 'up'}
              size={24}
              className={styles.expandIcon}
              aria-hidden="true"
            />
          </button>

          {/* Mini controls - visible in collapsed state */}
          <div className={styles.miniControls}>
            <button
              className={styles.playButton}
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Spill'}
              disabled={isLoading || audioError}
            >
              {isLoading ? (
                <SpinnerIcon size={24} className={styles.loading} />
              ) : audioError ? (
                <ErrorIcon size={24} />
              ) : isPlaying ? (
                <PauseIcon size={24} />
              ) : (
                <PlayIcon size={24} />
              )}
            </button>
          </div>

          {/* Close button - mobile collapsed */}
          <button
            className={styles.mobileCloseButton}
            onClick={onClose}
            aria-label="Lukk avspiller"
          >
            <CloseIcon size={24} />
          </button>
        </div>
        {/* End contentRow */}

        {/* Full controls - visible in expanded state */}
        <div className={styles.fullControls}>
          <div className={styles.controls}>
            <button
              className={styles.skipButton}
              onClick={skipBackward}
              aria-label="Spol tilbake 10 sekunder"
              title="Spol tilbake 10 sekunder"
            >
              <RotateCcwIcon size={24} />
              <span className={styles.skipLabel}>10</span>
            </button>

            <button
              className={styles.playButton}
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Spill'}
              disabled={isLoading || audioError}
            >
              {isLoading ? (
                <SpinnerIcon size={32} className={styles.loading} />
              ) : audioError ? (
                <ErrorIcon size={32} />
              ) : isPlaying ? (
                <PauseIcon size={32} />
              ) : (
                <PlayIcon size={32} />
              )}
            </button>

            <button
              className={styles.skipButton}
              onClick={skipForward}
              aria-label="Spol fremover 30 sekunder"
              title="Spol fremover 30 sekunder"
            >
              <RotateCwIcon size={24} />
              <span className={styles.skipLabel}>30</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className={styles.progress}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className={styles.slider}
              aria-label="Avspillingsposisjon"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              aria-valuetext={`${formatTime(currentTime)} av ${formatTime(duration)}`}
              style={{
                background: `linear-gradient(to right, var(--accent) ${progress}%, var(--border) ${progress}%)`,
              }}
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          {/* Speed and sleep timer controls */}
          <div className={styles.secondaryControls}>
            <button
              className={styles.secondaryButton}
              onClick={cycleSpeed}
              aria-label={`Avspillingshastighet: ${playbackSpeed}x. Trykk for å endre.`}
              title="Endre hastighet"
            >
              <span className={styles.speedLabel}>{playbackSpeed}x</span>
            </button>

            <button
              className={`${styles.secondaryButton} ${sleepTimerMinutes !== 0 ? styles.active : ''}`}
              onClick={cycleSleepTimer}
              aria-label={
                sleepTimerMinutes === 0
                  ? 'Søvntimer av. Trykk for å stille inn.'
                  : `Søvntimer: ${formatSleepTimerRemaining()}`
              }
              title="Søvntimer"
            >
              <MoonIcon size={20} aria-hidden="true" />
              {sleepTimerMinutes !== 0 && (
                <span className={styles.timerLabel}>{formatSleepTimerRemaining()}</span>
              )}
            </button>
          </div>

          {/* Error message */}
          {audioError && (
            <p className={styles.errorMessage} role="alert">
              Kunne ikke laste av lydfilen
            </p>
          )}
        </div>
      </div>

      {/* Close button - positioned outside container for full-width positioning */}
      <button className={styles.closeButton} onClick={onClose} aria-label="Lukk avspiller">
        <CloseIcon size={24} />
      </button>
    </div>
  );
}
