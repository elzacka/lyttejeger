import { useState } from 'react'
import type { Podcast } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { PodcastCard } from './PodcastCard'
import { PodcastModal } from './PodcastModal'
import styles from './PodcastList.module.css'

interface PodcastListProps {
  podcasts: Podcast[]
  searchQuery?: string
  isLoading?: boolean
  onPlayEpisode: (episode: PlayingEpisode) => void
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeletonImage} skeleton`} />
      <div className={styles.skeletonContent}>
        <div className={`${styles.skeletonTitle} skeleton`} />
        <div className={`${styles.skeletonText} skeleton`} />
        <div className={`${styles.skeletonTextShort} skeleton`} />
      </div>
    </div>
  )
}

export function PodcastList({ podcasts, searchQuery, isLoading, onPlayEpisode }: PodcastListProps) {
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null)

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonGrid} role="status" aria-label="Laster inn podcaster">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (podcasts.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <p className={styles.resultCount} aria-live="polite">
        {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcaster'}
      </p>
      <div className={styles.grid} role="list" aria-label="Søkeresultater for podcaster">
        {podcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            searchQuery={searchQuery}
            onSelect={setSelectedPodcast}
          />
        ))}
      </div>
      {selectedPodcast && (
        <PodcastModal
          podcast={selectedPodcast}
          onClose={() => setSelectedPodcast(null)}
          onPlayEpisode={onPlayEpisode}
        />
      )}
    </div>
  )
}
