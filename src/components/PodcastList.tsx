import { useRef, useState, useLayoutEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ChevronIcon } from './icons';
import type { Podcast } from '../types/podcast';
import { PodcastCard } from './PodcastCard';
import styles from './PodcastList.module.css';

// Estimated height per podcast card
const ESTIMATED_ITEM_HEIGHT = 100;

type SortBy = 'relevance' | 'newest' | 'oldest' | 'popular';

const SORT_LABELS: Record<SortBy, string> = {
  relevance: 'Relevans',
  newest: 'Nyeste',
  oldest: 'Eldste',
  popular: 'Populære',
};

interface PodcastListProps {
  podcasts: Podcast[];
  searchQuery?: string;
  isLoading?: boolean;
  onSelectPodcast: (podcast: Podcast) => void;
  sortBy?: SortBy;
  onSetSortBy?: (sortBy: SortBy) => void;
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
  sortBy = 'relevance',
  onSetSortBy,
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

  const headerContent = (
    <div className={styles.listHeader}>
      <p className={styles.resultCount} aria-live="polite">
        {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcaster'}
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
      {headerContent}
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
