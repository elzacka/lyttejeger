import { useRef, useState, useLayoutEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ChevronIcon } from './icons';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlayingEpisode } from './AudioPlayer';
import { EpisodeCard } from './EpisodeCard';
import { usePlaybackProgress } from '../hooks/usePlaybackProgress';
import { VIRTUALIZATION_MIN_ITEMS, SORT_LABELS, type SortBy } from '../constants';
import styles from './EpisodeList.module.css';

// Episode cards are slightly taller due to extra metadata line
const ESTIMATED_EPISODE_HEIGHT = 110;

interface EpisodeListProps {
  episodes: EpisodeWithPodcast[];
  searchQuery?: string;
  isLoading?: boolean;
  onPlayEpisode: (episode: PlayingEpisode) => void;
  onAddToQueue?: (episode: EpisodeWithPodcast) => void;
  onPlayNext?: (episode: EpisodeWithPodcast) => void;
  isInQueue?: (episodeId: string) => boolean;
  onSelectPodcast?: (podcastId: string) => void;
  sortBy?: SortBy;
  onSetSortBy?: (sortBy: SortBy) => void;
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
  );
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
  sortBy = 'relevance',
  onSetSortBy,
}: EpisodeListProps) {
  const { getProgress } = usePlaybackProgress();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Use virtualization for large lists
  const useVirtual = episodes.length >= VIRTUALIZATION_MIN_ITEMS;

  // Compute scroll margin after layout
  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: episodes.length,
    estimateSize: () => ESTIMATED_EPISODE_HEIGHT,
    overscan: 5,
    scrollMargin,
    enabled: useVirtual,
    // Measure actual element height for accurate positioning
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height ?? ESTIMATED_EPISODE_HEIGHT
        : undefined,
  });

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
    );
  }

  if (episodes.length === 0) {
    if (!searchQuery) return null;
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Ingen episoder funnet for "{searchQuery}"</p>
      </div>
    );
  }

  const headerContent = (
    <div className={styles.listHeader}>
      <p className={styles.resultCount} aria-live="polite">
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episoder'}
      </p>
      {onSetSortBy && searchQuery && (
        <div className={styles.sortWrapper}>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => onSetSortBy(e.target.value as SortBy)}
            aria-label="Sorter resultater"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronIcon size={14} className={styles.sortIcon} aria-hidden="true" />
        </div>
      )}
    </div>
  );

  // Non-virtualized render for small lists
  if (!useVirtual) {
    return (
      <div className={styles.container}>
        {headerContent}
        <div className={styles.list} role="list" aria-label="Søkeresultater for episoder">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onPlay={(ep) =>
                onPlayEpisode({
                  ...ep,
                  podcastTitle: ep.podcast?.title,
                  podcastImage: ep.podcast?.imageUrl,
                })
              }
              onAddToQueue={onAddToQueue}
              onPlayNext={onPlayNext}
              isInQueue={isInQueue?.(episode.id) ?? false}
              progress={getProgress(episode.id)}
              onSelectPodcast={onSelectPodcast}
            />
          ))}
        </div>
      </div>
    );
  }

  // Virtualized render for large lists - uses window scroll
  const items = virtualizer.getVirtualItems();

  return (
    <div className={styles.container}>
      {headerContent}
      <div
        ref={listRef}
        className={styles.virtualList}
        role="list"
        aria-label="Søkeresultater for episoder"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {items.map((virtualItem) => {
          const episode = episodes[virtualItem.index];
          return (
            <div
              key={episode.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className={styles.virtualItem}
              style={{
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
              }}
            >
              <EpisodeCard
                episode={episode}
                onPlay={(ep) =>
                  onPlayEpisode({
                    ...ep,
                    podcastTitle: ep.podcast?.title,
                    podcastImage: ep.podcast?.imageUrl,
                  })
                }
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                isInQueue={isInQueue?.(episode.id) ?? false}
                progress={getProgress(episode.id)}
                onSelectPodcast={onSelectPodcast}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
