import { useEffect, useRef } from 'react'
import type { EpisodeWithPodcast } from '../utils/search'
import type { PlayingEpisode } from './AudioPlayer'
import { formatDuration } from '../utils/search'
import { useFocusTrap } from '../hooks/useFocusTrap'
import styles from './EpisodeModal.module.css'

interface EpisodeModalProps {
  episode: EpisodeWithPodcast
  onClose: () => void
  onPlayEpisode: (episode: PlayingEpisode) => void
}

export function EpisodeModal({ episode, onClose, onPlayEpisode }: EpisodeModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
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
          {imageUrl && (
            <img
              src={imageUrl}
              alt={`Omslagsbilde for ${episode.title}`}
              className={styles.image}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.svg'
              }}
            />
          )}
          <div className={styles.headerInfo}>
            {episode.podcast && (
              <p className={styles.podcastName}>{episode.podcast.title}</p>
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
              <span>{formatDate(episode.publishedAt)}</span>
            </div>
            {formatDuration(episode.duration) && (
              <div className={styles.metaItem}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                <span>{formatDuration(episode.duration)}</span>
              </div>
            )}
          </div>

          <p className={styles.description}>{episode.description}</p>
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
