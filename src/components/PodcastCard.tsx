import type { Podcast } from '../types/podcast'
import styles from './PodcastCard.module.css'

interface PodcastCardProps {
  podcast: Podcast
  searchQuery?: string
  onSelect?: (podcast: Podcast) => void
}

export function PodcastCard({ podcast, searchQuery, onSelect }: PodcastCardProps) {
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

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(podcast)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <article
      className={styles.card}
      role="listitem"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`${podcast.title} av ${podcast.author}`}
    >
      <div className={styles.imageContainer}>
        <img
          src={podcast.imageUrl}
          alt=""
          className={styles.image}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/favicon.svg'
          }}
        />
        {podcast.explicit && <span className={styles.explicitBadge}>E</span>}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>
          {searchQuery ? highlightText(podcast.title, searchQuery) : podcast.title}
        </h3>

        <p className={styles.author}>
          {searchQuery ? highlightText(podcast.author, searchQuery) : podcast.author}
        </p>

        <p className={styles.description}>
          {podcast.description.length > 120
            ? `${podcast.description.slice(0, 120)}...`
            : podcast.description}
        </p>
      </div>
    </article>
  )
}
