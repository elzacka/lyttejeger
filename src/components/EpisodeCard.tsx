import type { EpisodeWithPodcast } from '../utils/search'
import { formatDuration } from '../utils/search'
import styles from './EpisodeCard.module.css'

interface EpisodeCardProps {
  episode: EpisodeWithPodcast
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return 'I dag'
    if (diffDays === 1) return 'I går'
    if (diffDays < 7) return `${diffDays} dager siden`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    })
  }

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl

  return (
    <article className={styles.card} role="listitem">
      <div className={styles.imageContainer}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${episode.title} cover`}
            className={styles.image}
            loading="lazy"
          />
        )}
        <button className={styles.playOverlay} aria-label="Spill av episode">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
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
          <span className={styles.separator}>•</span>
          <span className={styles.duration}>{formatDuration(episode.duration)}</span>
        </div>
      </div>
    </article>
  )
}
