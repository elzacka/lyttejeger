import { useEffect, useRef, useState } from 'react'
import type { Podcast, Episode } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { getEpisodesByFeedId } from '../services/podcastIndex'
import { transformEpisodes } from '../services/podcastTransform'
import { formatDuration } from '../utils/search'
import { useFocusTrap } from '../hooks/useFocusTrap'
import styles from './PodcastModal.module.css'

interface PodcastModalProps {
  podcast: Podcast
  onClose: () => void
  onPlayEpisode: (episode: PlayingEpisode) => void
}

export function PodcastModal({ podcast, onClose, onPlayEpisode }: PodcastModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [episodesError, setEpisodesError] = useState<string | null>(null)

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

  // Fetch episodes when modal opens
  useEffect(() => {
    const fetchEpisodes = async () => {
      setIsLoadingEpisodes(true)
      setEpisodesError(null)

      try {
        const feedId = parseInt(podcast.id)
        if (isNaN(feedId)) {
          throw new Error('Invalid podcast ID')
        }

        const res = await getEpisodesByFeedId(feedId, 20)
        const transformedEpisodes = transformEpisodes(res.items || [])
        setEpisodes(transformedEpisodes)
      } catch (err) {
        console.error('Failed to load episodes:', err)
        setEpisodesError('Kunne ikke hente episodene. Prøv igjen.')
      } finally {
        setIsLoadingEpisodes(false)
      }
    }

    fetchEpisodes()
  }, [podcast.id])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleSubscribe = () => {
    window.open(podcast.feedUrl, '_blank', 'noopener,noreferrer')
  }

  const handlePlayEpisode = (episode: Episode) => {
    onPlayEpisode({
      ...episode,
      podcastTitle: podcast.title,
      podcastImage: podcast.imageUrl
    })
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="podcast-modal-title"
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
          <img
            src={podcast.imageUrl}
            alt={`Omslagsbilde for ${podcast.title}`}
            className={styles.image}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.svg'
            }}
          />
          <div className={styles.headerInfo}>
            <h2 id="podcast-modal-title" className={styles.title}>
              {podcast.title}
            </h2>
            <p className={styles.author}>{podcast.author}</p>
            <div className={styles.rating}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--warning-color)' }}>star</span>
              <span>{podcast.rating.toFixed(1)}</span>
            </div>
            {podcast.explicit && <span className={styles.explicitBadge}>Eksplisitt</span>}
          </div>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>{podcast.description}</p>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Episoder</span>
              <span className={styles.metaValue}>{podcast.episodeCount}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Sist oppdatert</span>
              <span className={styles.metaValue}>{formatDate(podcast.lastUpdated)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Språk</span>
              <span className={styles.metaValue}>{podcast.language}</span>
            </div>
          </div>

          <div className={styles.categories}>
            {podcast.categories.map((category) => (
              <span key={category} className={styles.category}>
                {category}
              </span>
            ))}
          </div>

          {/* Episodes section */}
          <div className={styles.episodesSection}>
            <h3 className={styles.episodesTitle}>Episoder</h3>

            {isLoadingEpisodes && (
              <div className={styles.loading}>
                <span className={`material-symbols-outlined ${styles.spinner}`}>progress_activity</span>
                <span>Henter episoder ...</span>
              </div>
            )}

            {episodesError && (
              <p className={styles.error}>{episodesError}</p>
            )}

            {!isLoadingEpisodes && !episodesError && episodes.length === 0 && (
              <p className={styles.noEpisodes}>Fant ingen episoder</p>
            )}

            {!isLoadingEpisodes && episodes.length > 0 && (
              <ul className={styles.episodeList}>
                {episodes.map((episode) => (
                  <li key={episode.id} className={styles.episodeItem}>
                    <button
                      className={styles.episodeButton}
                      onClick={() => handlePlayEpisode(episode)}
                      aria-label={`Spill ${episode.title}`}
                    >
                      <span className="material-symbols-outlined">play_circle</span>
                    </button>
                    <div className={styles.episodeInfo}>
                      <p className={styles.episodeTitle}>{episode.title}</p>
                      <div className={styles.episodeMeta}>
                        <span>{formatDate(episode.publishedAt)}</span>
                        {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.subscribeButton} onClick={handleSubscribe}>
            <span className="material-symbols-outlined">rss_feed</span>
            Abonner
          </button>
        </div>
      </div>
    </div>
  )
}
