import { useState, useRef, useEffect, useCallback } from 'react'
import type { Episode } from '../types/podcast'
import { savePlaybackPosition, getPlaybackPosition } from '../services/db'
import styles from './AudioPlayer.module.css'

export interface PlayingEpisode extends Episode {
  podcastTitle?: string
  podcastImage?: string
}

interface AudioPlayerProps {
  episode: PlayingEpisode | null
  onClose: () => void
}

export function AudioPlayer({ episode, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const prevEpisodeIdRef = useRef<string | undefined>(undefined)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Track last save time to debounce saves
  const lastSaveRef = useRef<number>(0)
  const saveIntervalRef = useRef<number | null>(null)

  // Reset and prepare for auto-play when episode changes
  const episodeId = episode?.id
  if (episodeId !== prevEpisodeIdRef.current) {
    prevEpisodeIdRef.current = episodeId
    if (episode) {
      // These will be set before render completes
      if (currentTime !== 0) setCurrentTime(0)
      if (isPlaying !== false) setIsPlaying(false)
      if (isLoading !== true) setIsLoading(true)
      // Mark that we should auto-play once audio is ready
      if (!shouldAutoPlay) setShouldAutoPlay(true)
    }
  }

  // Load saved position when episode loads
  // Note: We don't auto-play here because iOS requires user gesture
  // The play action is triggered by user tap which calls togglePlayPause
  useEffect(() => {
    if (!episode || !audioRef.current) return

    const loadSavedPosition = async () => {
      const saved = await getPlaybackPosition(episode.id)
      if (saved && !saved.completed && audioRef.current) {
        // Resume from saved position (but not if completed)
        audioRef.current.currentTime = saved.position
        setCurrentTime(saved.position)
      }
      setIsLoading(false)
    }

    loadSavedPosition()
  }, [episode])

  // Save playback position every 5 seconds while playing
  useEffect(() => {
    if (!episode || !isPlaying) {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
      return
    }

    saveIntervalRef.current = window.setInterval(() => {
      const now = Date.now()
      if (now - lastSaveRef.current >= 5000 && audioRef.current) {
        lastSaveRef.current = now
        savePlaybackPosition(
          episode.id,
          audioRef.current.currentTime,
          audioRef.current.duration || duration
        )
      }
    }, 1000)

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
    }
  }, [episode, isPlaying, duration])

  // Save position on pause/close
  useEffect(() => {
    const audio = audioRef.current
    const currentEpisode = episode
    const currentDuration = duration

    return () => {
      // Save on unmount if we have an episode
      if (currentEpisode && audio) {
        savePlaybackPosition(
          currentEpisode.id,
          audio.currentTime,
          audio.duration || currentDuration
        )
      }
    }
  }, [episode, duration])

  // Media Session API - for lock screen controls and artwork
  useEffect(() => {
    if (!episode || !('mediaSession' in navigator)) return

    const imageUrl = episode.imageUrl || episode.podcastImage

    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: episode.podcastTitle || '',
      album: episode.podcastTitle || 'Lyttejeger',
      artwork: imageUrl ? [
        { src: imageUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: imageUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: imageUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: imageUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: imageUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: imageUrl, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    })

    // Set up action handlers
    // iOS/Bluetooth: Play handler needs to handle suspended audio context
    navigator.mediaSession.setActionHandler('play', async () => {
      if (!audioRef.current) return
      try {
        await audioRef.current.play()
      } catch {
        // Audio might be in suspended state - try to resume
        // This can happen when screen is locked with Bluetooth connected
        try {
          audioRef.current.load()
          await audioRef.current.play()
        } catch {
          // Still failed - user needs to unlock screen
        }
      }
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause()
    })
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
      }
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30)
      }
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime !== undefined) {
        audioRef.current.currentTime = details.seekTime
      }
    })

    return () => {
      // Clean up action handlers
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [episode, duration])

  // Update Media Session playback state and position
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // Update position state for lock screen progress bar
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: currentTime
      })
    } catch {
      // setPositionState may not be supported
    }
  }, [currentTime, duration])

  // Handle visibility change - helps resume audio on iOS when returning from lock screen
  useEffect(() => {
    if (!episode) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        // Sync UI state with actual audio state when app becomes visible
        setIsPlaying(!audioRef.current.paused)
        setCurrentTime(audioRef.current.currentTime)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [episode])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setIsLoading(false)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  const handlePlay = useCallback(() => setIsPlaying(true), [])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    // Save position immediately on pause
    if (episode && audioRef.current) {
      savePlaybackPosition(
        episode.id,
        audioRef.current.currentTime,
        audioRef.current.duration || duration
      )
    }
  }, [episode, duration])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    // Mark as completed when ended
    if (episode && audioRef.current) {
      savePlaybackPosition(
        episode.id,
        audioRef.current.duration,
        audioRef.current.duration
      )
    }
  }, [episode])
  const handleWaiting = useCallback(() => setIsLoading(true), [])
  const handleCanPlay = useCallback(() => {
    setIsLoading(false)
    // Auto-play when audio is ready and we have a pending play request
    // On iOS, we need to be careful - play() promise may resolve but audio may not actually play
    if (shouldAutoPlay && audioRef.current) {
      setShouldAutoPlay(false)
      const audio = audioRef.current
      audio.play()
        .then(() => {
          // Check if audio is actually playing after a short delay
          // iOS sometimes resolves play() but doesn't actually start playback
          setTimeout(() => {
            if (audio.paused) {
              setIsPlaying(false)
            }
          }, 100)
        })
        .catch(() => {
          // Autoplay was blocked - user must tap play button manually
          setIsPlaying(false)
        })
    }
  }, [shouldAutoPlay])
  const handleError = useCallback(() => {
    setIsLoading(false)
    setIsPlaying(false)
    setShouldAutoPlay(false)
  }, [])

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return

    const audio = audioRef.current

    if (isPlaying) {
      audio.pause()
    } else {
      try {
        // On iOS, we may need to load the audio first if it was suspended
        if (audio.readyState < 2) {
          audio.load()
        }
        await audio.play()
        // Double-check that playback actually started (iOS quirk)
        setTimeout(() => {
          if (audio.paused && !isPlaying) {
            // Playback didn't actually start - try loading and playing again
            audio.load()
            audio.play().catch(() => {})
          }
        }, 150)
      } catch {
        // Play failed - might need user interaction on iOS
        // Try loading first then playing
        try {
          audio.load()
          await audio.play()
        } catch {
          // Still failed - nothing more we can do
        }
      }
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
    }
  }, [])

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30)
    }
  }, [duration])

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!episode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const imageUrl = episode.imageUrl || episode.podcastImage

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Handle click on the info area - behavior depends on mobile/expanded state
  const handleInfoClick = useCallback(() => {
    // On mobile collapsed state, tapping info should play/pause (expected mini-player behavior)
    // On desktop or expanded state, toggle expansion
    if (window.innerWidth <= 640 && !isExpanded) {
      togglePlayPause()
    } else {
      toggleExpanded()
    }
  }, [isExpanded, togglePlayPause, toggleExpanded])

  return (
    <div className={`${styles.player} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        preload="metadata"
        playsInline
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
      <div
        className={styles.miniProgress}
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />

      <div className={styles.container}>
        {/* Episode info - on mobile collapsed: play/pause, otherwise: expand/collapse */}
        <button
          className={styles.info}
          onClick={handleInfoClick}
          aria-label={isExpanded ? 'Skjul kontroller' : (window.innerWidth <= 640 ? (isPlaying ? 'Pause' : 'Spill') : 'Vis kontroller')}
          aria-expanded={isExpanded}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={episode.podcastTitle || episode.title}
              className={styles.image}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const placeholder = document.createElement('div')
                placeholder.className = `${styles.image} image-placeholder`
                placeholder.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                target.parentNode?.insertBefore(placeholder, target)
              }}
            />
          ) : (
            <div className={`${styles.image} image-placeholder`}>
              <span className="material-symbols-outlined" aria-hidden="true">podcasts</span>
            </div>
          )}
          <div className={styles.text}>
            <p className={styles.title}>{episode.title}</p>
            {episode.podcastTitle && (
              <p className={styles.podcast}>{episode.podcastTitle}</p>
            )}
          </div>
          <span className={`material-symbols-outlined ${styles.expandIcon}`} aria-hidden="true">
            {isExpanded ? 'expand_more' : 'expand_less'}
          </span>
        </button>

        {/* Mini controls - visible in collapsed state */}
        <div className={styles.miniControls}>
          <button
            className={styles.playButton}
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Spill'}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={`material-symbols-outlined ${styles.loading}`}>progress_activity</span>
            ) : isPlaying ? (
              <span className="material-symbols-outlined">pause</span>
            ) : (
              <span className="material-symbols-outlined">play_arrow</span>
            )}
          </button>
          <button
            className={styles.expandButton}
            onClick={toggleExpanded}
            aria-label="Vis full avspiller"
          >
            <span className="material-symbols-outlined">expand_less</span>
          </button>
        </div>

        {/* Full controls - visible in expanded state */}
        <div className={styles.fullControls}>
          <div className={styles.controls}>
            <button
              className={styles.skipButton}
              onClick={skipBackward}
              aria-label="Spol tilbake 10 sekunder"
              title="Spol tilbake 10 sekunder"
            >
              <span className="material-symbols-outlined">replay_10</span>
            </button>

            <button
              className={styles.playButton}
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Spill'}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={`material-symbols-outlined ${styles.loading}`}>progress_activity</span>
              ) : isPlaying ? (
                <span className="material-symbols-outlined">pause</span>
              ) : (
                <span className="material-symbols-outlined">play_arrow</span>
              )}
            </button>

            <button
              className={styles.skipButton}
              onClick={skipForward}
              aria-label="Spol fremover 30 sekunder"
              title="Spol fremover 30 sekunder"
            >
              <span className="material-symbols-outlined">forward_30</span>
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
              tabIndex={-1}
              style={{
                background: `linear-gradient(to right, var(--accent) ${progress}%, var(--border) ${progress}%)`
              }}
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Lukk avspiller"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  )
}
