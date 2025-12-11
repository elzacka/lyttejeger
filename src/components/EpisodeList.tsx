import { useState } from 'react'
import type { EpisodeWithPodcast } from '../utils/search'
import type { PlayingEpisode } from './AudioPlayer'
import { EpisodeCard } from './EpisodeCard'
import { EpisodeModal } from './EpisodeModal'
import styles from './EpisodeList.module.css'

interface EpisodeListProps {
  episodes: EpisodeWithPodcast[]
  searchQuery?: string
  isLoading?: boolean
  onPlayEpisode: (episode: PlayingEpisode) => void
  onAddToQueue?: (episode: EpisodeWithPodcast) => void
  onPlayNext?: (episode: EpisodeWithPodcast) => void
  isInQueue?: (episodeId: string) => boolean
  onSelectPodcast?: (podcastId: string) => void
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

export function EpisodeList({
  episodes,
  searchQuery,
  isLoading,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
  onSelectPodcast,
}: EpisodeListProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeWithPodcast | null>(null)

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonList} role="status" aria-label="Laster inn episoder">
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
    if (!searchQuery) return null
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>
          Ingen episoder funnet for "{searchQuery}"
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <p className={styles.resultCount} aria-live="polite">
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episoder'}
      </p>
      <div className={styles.list} role="list" aria-label="Søkeresultater for episoder">
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            onPlay={(ep) => onPlayEpisode({
              ...ep,
              podcastTitle: ep.podcast?.title,
              podcastImage: ep.podcast?.imageUrl
            })}
            onShowDetails={setSelectedEpisode}
            onAddToQueue={onAddToQueue}
            onPlayNext={onPlayNext}
            isInQueue={isInQueue?.(episode.id) ?? false}
          />
        ))}
      </div>
      {selectedEpisode && (
        <EpisodeModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onPlayEpisode={onPlayEpisode}
          onSelectPodcast={onSelectPodcast}
        />
      )}
    </div>
  )
}
