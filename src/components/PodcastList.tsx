import type { Podcast } from '../types/podcast'
import { PodcastCard } from './PodcastCard'
import styles from './PodcastList.module.css'

interface PodcastListProps {
  podcasts: Podcast[]
  searchQuery?: string
  isLoading?: boolean
}

export function PodcastList({ podcasts, searchQuery, isLoading }: PodcastListProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Søker...</p>
      </div>
    )
  }

  if (podcasts.length === 0) {
    return (
      <div className={styles.empty}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 8h6" />
        </svg>
        <h3>Ingen podcaster funnet</h3>
        <p>Prøv å justere søket eller filtrene dine</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <p className={styles.resultCount}>
        {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcaster'} funnet
      </p>
      <div className={styles.grid}>
        {podcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  )
}
