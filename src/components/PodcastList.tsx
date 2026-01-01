import { useRef, useState, useLayoutEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Podcast } from '../types/podcast';
import { PodcastCard } from './PodcastCard';
import styles from './PodcastList.module.css';

// Estimated height per podcast card
const ESTIMATED_ITEM_HEIGHT = 100;

interface PodcastListProps {
  podcasts: Podcast[];
  searchQuery?: string;
  isLoading?: boolean;
  onSelectPodcast: (podcast: Podcast) => void;
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
  );
}

export function PodcastList({
  podcasts,
  searchQuery,
  isLoading,
  onSelectPodcast,
}: PodcastListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Use virtualization for lists with 20+ items
  const useVirtual = podcasts.length >= 20;

  // Compute scroll margin after layout
  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: podcasts.length,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
    scrollMargin,
    enabled: useVirtual,
  });

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
    );
  }

  if (podcasts.length === 0) {
    if (!searchQuery) return null;
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Ingen podcaster funnet for "{searchQuery}"</p>
      </div>
    );
  }

  // Non-virtualized render for small lists
  if (!useVirtual) {
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
              onSelect={onSelectPodcast}
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
      <p className={styles.resultCount} aria-live="polite">
        {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcaster'}
      </p>
      <div
        ref={listRef}
        className={styles.virtualList}
        role="list"
        aria-label="Søkeresultater for podcaster"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {items.map((virtualItem) => {
          const podcast = podcasts[virtualItem.index];
          return (
            <div
              key={podcast.id}
              className={styles.virtualItem}
              style={{
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
              }}
            >
              <PodcastCard podcast={podcast} searchQuery={searchQuery} onSelect={onSelectPodcast} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
