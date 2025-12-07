import { useState, useRef, useEffect, useCallback } from 'react'
import type { Episode } from '../types/podcast'
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

  // Reset and auto-play when episode changes
  const episodeId = episode?.id
  if (episodeId !== prevEpisodeIdRef.current) {
    prevEpisodeIdRef.current = episodeId
    if (episode) {
      // These will be set before render completes
      if (currentTime !== 0) setCurrentTime(0)
      if (isPlaying !== false) setIsPlaying(false)
      if (isLoading !== true) setIsLoading(true)
    }
  }

  // Auto-play when episode loads
  useEffect(() => {
    if (episode && audioRef.current) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
      })
    }
  }, [episode])

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
  const handlePause = useCallback(() => setIsPlaying(false), [])
  const handleEnded = useCallback(() => setIsPlaying(false), [])
  const handleWaiting = useCallback(() => setIsLoading(true), [])
  const handleCanPlay = useCallback(() => setIsLoading(false), [])

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
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
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
