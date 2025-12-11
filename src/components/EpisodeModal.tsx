import { useEffect, useRef, useState } from 'react'
import type { EpisodeWithPodcast } from '../utils/search'
import type { PlayingEpisode } from './AudioPlayer'
import { formatDuration, formatDateLong } from '../utils/search'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { TranscriptViewer } from './TranscriptViewer'
import styles from './EpisodeModal.module.css'

interface EpisodeModalProps {
  episode: EpisodeWithPodcast
  onClose: () => void
  onPlayEpisode: (episode: PlayingEpisode) => void
  onSelectPodcast?: (podcastId: string) => void
}

export function EpisodeModal({ episode, onClose, onPlayEpisode, onSelectPodcast }: EpisodeModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    // Save the currently focused element to restore later
    previouslyFocusedRef.current = document.activeElement as HTMLElement

    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscape)
      // Restore focus to previously focused element
      previouslyFocusedRef.current?.focus()
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handlePlay = () => {
    if (episode.audioUrl) {
      onPlayEpisode({
        ...episode,
        podcastTitle: episode.podcast?.title,
        podcastImage: episode.podcast?.imageUrl
      })
      onClose()
    }
  }

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="episode-modal-title"
    >
      <div className={styles.modal} ref={focusTrapRef}>
        <button
          ref={closeButtonRef}
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Lukk"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className={styles.header}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Omslagsbilde for ${episode.title}`}
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
          <div className={styles.headerInfo}>
            {episode.podcast && (
              onSelectPodcast ? (
                <button
                  className={styles.podcastLink}
                  onClick={() => {
                    onSelectPodcast(episode.podcast!.id)
                    onClose()
                  }}
                >
                  {episode.podcast.title}
                </button>
              ) : (
                <p className={styles.podcastName}>{episode.podcast.title}</p>
              )
            )}
            <h2 id="episode-modal-title" className={styles.title}>
              {episode.title}
            </h2>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
              <span>{formatDateLong(episode.publishedAt)}</span>
            </div>
            {formatDuration(episode.duration) && (
              <div className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                <span>{formatDuration(episode.duration)}</span>
              </div>
            )}
            {episode.transcriptUrl && (
              <div className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>subtitles</span>
                <span>Transkripsjon</span>
              </div>
            )}
          </div>

          <p className={styles.description}>{episode.description}</p>

          {episode.transcriptUrl && (
            <div className={styles.transcriptSection}>
              <button
                className={styles.transcriptToggle}
                onClick={() => setShowTranscript(!showTranscript)}
                aria-expanded={showTranscript}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showTranscript ? 'expand_less' : 'expand_more'}
                </span>
                {showTranscript ? 'Skjul transkripsjon' : 'Vis transkripsjon'}
              </button>

              {showTranscript && (
                <TranscriptViewer transcriptUrl={episode.transcriptUrl} />
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.playButton}
            onClick={handlePlay}
            disabled={!episode.audioUrl}
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Spill av
          </button>
        </div>
      </div>
    </div>
  )
}
