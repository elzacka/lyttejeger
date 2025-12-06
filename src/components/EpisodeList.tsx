import type { EpisodeWithPodcast } from '../utils/search'
import { EpisodeCard } from './EpisodeCard'
import styles from './EpisodeList.module.css'

interface EpisodeListProps {
  episodes: EpisodeWithPodcast[]
  isLoading?: boolean
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeletonImage} skeleton`} />
      <div className={styles.skeletonContent}>
        <div className={`${styles.skeletonPodcast} skeleton`} />
        <div className={`${styles.skeletonTitle} skeleton`} />
        <div className={`${styles.skeletonText} skeleton`} />
        <div className={`${styles.skeletonMeta} skeleton`} />
      </div>
    </div>
  )
}

export function EpisodeList({ episodes, isLoading }: EpisodeListProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <p className={styles.resultCount} aria-live="polite">Søker...</p>
        <div className={styles.skeletonList} role="status" aria-label="Laster episoder">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className={styles.empty} role="status" aria-live="polite">
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
          aria-hidden="true"
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
      <p className={styles.resultCount} aria-live="polite">
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episoder'} funnet
      </p>
      <div className={styles.list} role="list" aria-label="Episode-resultater">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  )
}
