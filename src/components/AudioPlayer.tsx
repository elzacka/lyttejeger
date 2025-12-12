import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Episode } from '../types/podcast'
import { savePlaybackPosition, getPlaybackPosition } from '../services/db'
import styles from './AudioPlayer.module.css'

// Swipe detection threshold in pixels
const SWIPE_THRESHOLD = 50

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [audioError, setAudioError] = useState(false)

  // Track episode id for change detection
  const currentEpisodeIdRef = useRef<string | null>(null)
  // Track if we should auto-play when audio becomes ready
  const shouldAutoPlayRef = useRef(false)

  // Track last save time to debounce saves
  const lastSaveRef = useRef<number>(0)
  const saveIntervalRef = useRef<number | null>(null)

  // Handle episode changes - set autoplay flag and load position
  useEffect(() => {
    const episodeId = episode?.id ?? null

    // If episode hasn't changed, do nothing
    if (episodeId === currentEpisodeIdRef.current) {
      return
    }

    // Update ref
    currentEpisodeIdRef.current = episodeId

    if (episode && audioRef.current) {
      // Reset state for new episode
      setIsLoading(true)
      setAudioError(false)
      setIsPlaying(false)

      // New episode - mark for auto-play when audio becomes ready
      shouldAutoPlayRef.current = true

      // Explicitly load the new source
      audioRef.current.load()

      // Load saved position asynchronously
      const loadPosition = async () => {
        try {
          const saved = await getPlaybackPosition(episode.id)
          if (saved && !saved.completed && audioRef.current) {
            audioRef.current.currentTime = saved.position
            setCurrentTime(saved.position)
          }
        } catch {
          // Ignore position load errors
        }
      }

      loadPosition()
    } else {
      shouldAutoPlayRef.current = false
    }
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

  // Save position on unmount
  useEffect(() => {
    const audio = audioRef.current
    const currentEpisode = episode
    const currentDuration = duration

    return () => {
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
    })

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', async () => {
      if (!audioRef.current) return
      try {
        await audioRef.current.play()
      } catch {
        try {
          audioRef.current.load()
          await audioRef.current.play()
        } catch {
          // Still failed - user needs to interact
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
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [episode, duration])

  // Update Media Session playback state
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
        position: currentTime,
      })
    } catch {
      // setPositionState may not be supported
    }
  }, [currentTime, duration])

  // Handle visibility change - sync UI with audio state
  useEffect(() => {
    if (!episode) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        setIsPlaying(!audioRef.current.paused)
        setCurrentTime(audioRef.current.currentTime)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [episode])

  // Audio event handlers
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
    if (episode && audioRef.current) {
      savePlaybackPosition(episode.id, audioRef.current.duration, audioRef.current.duration)
    }
  }, [episode])

  const handleWaiting = useCallback(() => setIsLoading(true), [])

  const handleCanPlay = useCallback(() => {
    setIsLoading(false)
    setAudioError(false)

    // Auto-play if this is a new episode
    if (shouldAutoPlayRef.current && audioRef.current) {
      shouldAutoPlayRef.current = false
      const audio = audioRef.current

      // Try to play - use a small delay to ensure audio is truly ready
      const attemptPlay = async () => {
        try {
          await audio.play()
        } catch {
          // Autoplay blocked - this is expected on iOS/Safari without user gesture
          // The user will need to tap play manually
          setIsPlaying(false)
        }
      }

      attemptPlay()
    }
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setIsPlaying(false)
    setAudioError(true)
    shouldAutoPlayRef.current = false
  }, [])

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || audioError) return

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
      } catch {
        // Play failed - try loading first
        try {
          audio.load()
          await audio.play()
        } catch {
          // Still failed - set error state
          setAudioError(true)
        }
      }
    }
  }, [isPlaying, audioError])

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

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleInfoClick = useCallback(() => {
    toggleExpanded()
  }, [toggleExpanded])

  // Swipe gesture handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaY = touchStartRef.current.y - touch.clientY
    const deltaX = Math.abs(touchStartRef.current.x - touch.clientX)

    // Only trigger swipe if vertical movement is dominant and exceeds threshold
    if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > deltaX) {
      if (deltaY > 0 && !isExpanded) {
        // Swipe up - expand
        setIsExpanded(true)
      } else if (deltaY < 0 && isExpanded) {
        // Swipe down - collapse
        setIsExpanded(false)
      }
    }

    touchStartRef.current = null
  }, [isExpanded])

  const swipeHandlers = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchEnd])

  // Don't render if no episode
  if (!episode) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const imageUrl = episode.imageUrl || episode.podcastImage

  return (
    <div
      className={`${styles.player} ${isExpanded ? styles.expanded : styles.collapsed}`}
      {...swipeHandlers}
    >
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        preload="auto"
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
      <div className={styles.miniProgress} style={{ width: `${progress}%` }} aria-hidden="true" />

      <div className={styles.container}>
        {/* Swipe handle indicator */}
        <div className={styles.swipeHandle} aria-hidden="true" />

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
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const placeholder = document.createElement('div')
                placeholder.className = `${styles.image} image-placeholder`
                placeholder.innerHTML =
                  '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                target.parentNode?.insertBefore(placeholder, target)
              }}
            />
          ) : (
            <div className={`${styles.image} image-placeholder`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                podcasts
              </span>
            </div>
          )}
          <div className={styles.text}>
            <p className={styles.title}>{episode.title}</p>
            {episode.podcastTitle && <p className={styles.podcast}>{episode.podcastTitle}</p>}
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
            disabled={isLoading || audioError}
          >
            {isLoading ? (
              <span className={`material-symbols-outlined ${styles.loading}`}>
                progress_activity
              </span>
            ) : audioError ? (
              <span className="material-symbols-outlined">error</span>
            ) : isPlaying ? (
              <span className="material-symbols-outlined">pause</span>
            ) : (
              <span className="material-symbols-outlined">play_arrow</span>
            )}
          </button>
        </div>
        </div>{/* End contentRow */}

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
              disabled={isLoading || audioError}
            >
              {isLoading ? (
                <span className={`material-symbols-outlined ${styles.loading}`}>
                  progress_activity
                </span>
              ) : audioError ? (
                <span className="material-symbols-outlined">error</span>
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
                background: `linear-gradient(to right, var(--accent) ${progress}%, var(--border) ${progress}%)`,
              }}
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          {/* Error message */}
          {audioError && (
            <p className={styles.errorMessage}>Kunne ikke laste av lydfilen</p>
          )}
        </div>

        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Lukk avspiller">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  )
}
