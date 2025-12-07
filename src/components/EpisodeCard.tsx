import type { EpisodeWithPodcast } from '../utils/search'
import { formatDuration, formatDate } from '../utils/search'
import styles from './EpisodeCard.module.css'

interface EpisodeCardProps {
  episode: EpisodeWithPodcast
  onPlay?: (episode: EpisodeWithPodcast) => void
}

export function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl

  const playEpisode = () => {
    if (onPlay) {
      onPlay(episode)
    } else if (episode.audioUrl) {
      window.open(episode.audioUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    playEpisode()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      playEpisode()
    }
  }

  return (
    <article
      className={styles.card}
      role="listitem"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`${episode.title}${episode.podcast ? ` fra ${episode.podcast.title}` : ''}`}
    >
      <div className={styles.imageContainer}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.svg'
            }}
          />
        )}
        <div
          className={styles.playOverlay}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">play_arrow</span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.podcastInfo}>
          {episode.podcast && (
            <span className={styles.podcastName}>{episode.podcast.title}</span>
          )}
        </div>

        <h3 className={styles.title}>{episode.title}</h3>

        <p className={styles.description}>
          {episode.description.length > 150
            ? `${episode.description.slice(0, 150)}...`
            : episode.description}
        </p>

        <div className={styles.meta}>
          <span className={styles.date}>{formatDate(episode.publishedAt)}</span>
          {formatDuration(episode.duration) && (
            <>
              <span className={styles.separator}>•</span>
              <span className={styles.duration}>{formatDuration(episode.duration)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
