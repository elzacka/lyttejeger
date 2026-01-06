import { memo, useState } from 'react';
import { PodcastIcon, ChevronIcon } from './icons';
import type { Podcast } from '../types/podcast';
import { formatDateLong } from '../utils/search';
import { FormattedText } from './FormattedText';
import styles from './PodcastCard.module.css';

interface PodcastCardProps {
  podcast: Podcast;
  onSelect?: (podcast: Podcast) => void;
  onExpandChange?: (expanded: boolean) => void;
}

export const PodcastCard = memo(function PodcastCard({
  podcast,
  onSelect,
  onExpandChange,
}: PodcastCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(podcast);
  };

  const lastUpdatedText = podcast.lastUpdated
    ? `Sist oppdatert ${formatDateLong(podcast.lastUpdated)}`
    : undefined;

  return (
    <article className={`${styles.item} ${isExpanded ? styles.expanded : ''}`} role="listitem">
      <div className={styles.podcastHeader}>
        <button
          className={styles.podcastToggle}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`podcast-details-${podcast.id}`}
        >
          {podcast.imageUrl && !imageError ? (
            <img
              src={podcast.imageUrl}
              alt=""
              className={styles.image}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`${styles.image} image-placeholder`}>
              <PodcastIcon size={24} aria-hidden="true" />
            </div>
          )}

          <div className={styles.info}>
            <span className={styles.podcastTitle}>{podcast.title}</span>
            <span className={styles.author}>{podcast.author}</span>
            <div className={styles.meta}>
              {lastUpdatedText && <span>{lastUpdatedText}</span>}
              {podcast.explicit && <span className={styles.explicitBadge}>E</span>}
            </div>
          </div>
        </button>

        {onSelect && (
          <div className={styles.actions}>
            <button
              className={styles.selectButton}
              onClick={handleSelect}
              aria-label={`Vis ${podcast.title}`}
            >
              <ChevronIcon size={20} direction="right" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div id={`podcast-details-${podcast.id}`} className={styles.podcastDetails}>
          {podcast.description ? (
            <p className={styles.podcastDescription}>
              <FormattedText text={podcast.description} />
            </p>
          ) : (
            <p className={styles.noDescription}>Ingen beskrivelse tilgjengelig</p>
          )}
        </div>
      )}
    </article>
  );
});
