import type { EpisodeWithPodcast } from '../utils/search'
import { EpisodeCard } from './EpisodeCard'
import styles from './EpisodeList.module.css'

interface EpisodeListProps {
  episodes: EpisodeWithPodcast[]
  isLoading?: boolean
}

export function EpisodeList({ episodes, isLoading }: EpisodeListProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Søker...</p>
      </div>
    )
  }

  if (episodes.length === 0) {
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
        <h3>Ingen episoder funnet</h3>
        <p>Prøv å justere søket ditt</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <p className={styles.resultCount}>
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episoder'} funnet
      </p>
      <div className={styles.list}>
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  )
}
