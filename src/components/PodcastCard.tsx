import { useState, memo } from 'react'
import type { Podcast } from '../types/podcast'
import { DESCRIPTION_TRUNCATE_LENGTH } from '../constants'
import styles from './PodcastCard.module.css'

interface PodcastCardProps {
  podcast: Podcast
  searchQuery?: string
  onSelect?: (podcast: Podcast) => void
}

export const PodcastCard = memo(function PodcastCard({ podcast, searchQuery, onSelect }: PodcastCardProps) {
  const [imageError, setImageError] = useState(false)
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${index}`} className={styles.highlight}>
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
        {imageError ? (
          <div className={`${styles.image} image-placeholder`}>
            <span className="material-symbols-outlined" aria-hidden="true">podcasts</span>
          </div>
        ) : (
          <img
            src={podcast.imageUrl}
            alt=""
            className={styles.image}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}
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
          {podcast.description.length > DESCRIPTION_TRUNCATE_LENGTH
            ? `${podcast.description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}...`
            : podcast.description}
        </p>
      </div>
    </article>
  )
})
