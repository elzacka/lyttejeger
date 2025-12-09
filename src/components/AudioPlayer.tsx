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
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play()
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
    // This works on iOS because it's triggered by the loadeddata/canplay event
    // which follows the user's tap action chain
    if (shouldAutoPlay && audioRef.current) {
      setShouldAutoPlay(false)
      audioRef.current.play().catch(() => {
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

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
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

  return (
    <div className={styles.player}>
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

      <div className={styles.container}>
        {/* Episode info */}
        <div className={styles.info}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={episode.podcastTitle || episode.title}
              className={styles.image}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.svg'
              }}
            />
          )}
          <div className={styles.text}>
            <p className={styles.title}>{episode.title}</p>
            {episode.podcastTitle && (
              <p className={styles.podcast}>{episode.podcastTitle}</p>
            )}
          </div>
        </div>

        {/* Controls */}
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
