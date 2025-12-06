import type { Podcast } from '../types/podcast'
import styles from './PodcastCard.module.css'

interface PodcastCardProps {
  podcast: Podcast
  searchQuery?: string
}

export function PodcastCard({ podcast, searchQuery }: PodcastCardProps) {
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className={styles.highlight}>
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

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

  return (
    <article className={styles.card} role="listitem">
      <div className={styles.imageContainer}>
        <img
          src={podcast.imageUrl}
          alt={`${podcast.title} cover`}
          className={styles.image}
          loading="lazy"
        />
        {podcast.explicit && <span className={styles.explicitBadge}>E</span>}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {searchQuery ? highlightText(podcast.title, searchQuery) : podcast.title}
          </h3>
          <div className={styles.rating}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.starIcon}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{podcast.rating.toFixed(1)}</span>
          </div>
        </div>

        <p className={styles.author}>
          {searchQuery ? highlightText(podcast.author, searchQuery) : podcast.author}
        </p>

        <p className={styles.description}>
          {podcast.description.length > 120
            ? `${podcast.description.slice(0, 120)}...`
            : podcast.description}
        </p>

        <div className={styles.meta}>
          <div className={styles.categories}>
            {podcast.categories.slice(0, 2).map((category) => (
              <span key={category} className={styles.category}>
                {category}
              </span>
            ))}
          </div>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20v-6M6 20V10M18 20V4" />
              </svg>
              {podcast.episodeCount} episoder
            </span>
            <span className={styles.stat}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDate(podcast.lastUpdated)}
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.language}>{podcast.language}</span>
          <button className={styles.playButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Spill av
          </button>
        </div>
      </div>
    </article>
  )
}
