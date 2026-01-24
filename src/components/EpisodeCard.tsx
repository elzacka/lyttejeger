import { useState, useRef, useEffect } from 'react';
import {
  Check as CheckIcon,
  MoreVertical as MoreVerticalIcon,
  Play as PlayIcon,
  GripVertical as GripVerticalIcon,
  Trash2 as TrashIcon,
} from 'lucide-react';
import type { Episode } from '../types/podcast';
import type { PlaybackProgress } from '../hooks/usePlaybackProgress';
import { formatDuration, formatDateLong } from '../utils/search';
import { FormattedText } from './FormattedText';
import { FEATURES } from '../config/features';
import { EpisodeBadges } from './EpisodeBadges';
import styles from './EpisodeCard.module.css';

/**
 * Format season/episode number as "S1 E5" style
 */
function formatSeasonEpisode(season?: number, episodeNum?: number): string | null {
  if (!season && !episodeNum) return null;
  const parts: string[] = [];
  if (season) parts.push(`S${season}`);
  if (episodeNum) parts.push(`E${episodeNum}`);
  return parts.join(' ');
}

/**
 * Podcast info to display on the card
 */
export interface EpisodePodcastInfo {
  id: string;
  title: string;
  imageUrl?: string;
}

/**
 * Simplified EpisodeCard props
 * Standardized design: cover art + title + metadata, expandable for description
 */
export interface EpisodeCardProps {
  /** The episode to display */
  episode: Episode;

  /** Optional podcast info (for views that show podcast name/image) */
  podcastInfo?: EpisodePodcastInfo;

  /** Whether to show podcast info (name, image) */
  showPodcastInfo?: boolean;

  /** Playback progress (percentage and completed state) */
  progress?: PlaybackProgress | null;

  /** Whether episode is in the queue */
  isInQueue?: boolean;

  /** Callback when play button is clicked */
  onPlay?: (episode: Episode) => void;

  /** Callback when "Add to queue" is clicked */
  onAddToQueue?: (episode: Episode) => void;

  /** Callback when "Play next" is clicked */
  onPlayNext?: (episode: Episode) => void;

  /** Callback when podcast name/link is clicked (navigate to podcast) */
  onSelectPodcast?: (podcastId: string) => void;

  /** Callback when remove button is clicked (for queue items) */
  onRemove?: () => void;

  // --- Queue variant specific props ---

  /** Enable drag-to-reorder (queue variant) */
  isDraggable?: boolean;

  /** Whether this item is currently being dragged */
  isDragging?: boolean;

  /** Whether another item is being dragged over this one */
  isDragOver?: boolean;

  /** Drag handle touch start handler */
  onDragTouchStart?: (e: React.TouchEvent) => void;

  /** Drag handle touch move handler */
  onDragTouchMove?: (e: React.TouchEvent) => void;

  /** Drag handle touch end handler */
  onDragTouchEnd?: () => void;

  /** Drag handle mouse down handler */
  onDragMouseDown?: (e: React.MouseEvent) => void;

  // --- Swipe-to-delete specific props ---

  /** Enable swipe-to-delete (mobile queue) */
  isSwipeable?: boolean;

  /** Callback for swipe touch start */
  onSwipeTouchStart?: (e: React.TouchEvent) => void;

  /** Callback for swipe touch move */
  onSwipeTouchMove?: (e: React.TouchEvent) => void;

  /** Callback for swipe touch end */
  onSwipeTouchEnd?: () => void;

  /** Whether this item is currently swiped open */
  isSwipedOpen?: boolean;

  /** Ref callback for the swipe content element */
  swipeContentRef?: React.RefCallback<HTMLDivElement>;

  /** Visual variant for different contexts */
  variant?: 'default' | 'queue';
}

export function EpisodeCard({
  episode,
  podcastInfo,
  showPodcastInfo = true,
  progress,
  isInQueue = false,
  onPlay,
  onAddToQueue,
  onPlayNext,
  onRemove,
  isDraggable = false,
  isDragging = false,
  isDragOver = false,
  onDragTouchStart,
  onDragTouchMove,
  onDragTouchEnd,
  onDragMouseDown,
  isSwipeable = false,
  onSwipeTouchStart,
  onSwipeTouchMove,
  onSwipeTouchEnd,
  isSwipedOpen = false,
  swipeContentRef,
  variant = 'default',
}: EpisodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Determine image URL from episode or podcast info
  const imageUrl = episode.imageUrl || podcastInfo?.imageUrl;

  // Get podcast name
  const podcastName = podcastInfo?.title;

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handlePlay = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onPlay) {
      onPlay(episode);
    } else if (episode.audioUrl) {
      window.open(episode.audioUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleExpand = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleMenuClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(!menuOpen);
  };

  const handleAddToQueue = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onAddToQueue?.(episode);
    setMenuOpen(false);
  };

  const handlePlayNext = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onPlayNext?.(episode);
    setMenuOpen(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove?.();
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items?.length) return;
    const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      (items[nextIndex] as HTMLElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      (items[prevIndex] as HTMLElement).focus();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay(e);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Queue variant has different structure for swipe-to-delete and drag
  if (variant === 'queue') {
    return (
      <article
        className={`${styles.queueItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
        role="listitem"
        onTouchStart={isSwipeable ? onSwipeTouchStart : undefined}
        onTouchMove={isSwipeable ? onSwipeTouchMove : undefined}
        onTouchEnd={isSwipeable ? onSwipeTouchEnd : undefined}
      >
        {/* Delete action revealed on swipe */}
        {isSwipeable && (
          <div className={styles.swipeAction}>
            <button
              className={styles.deleteButton}
              onClick={handleRemove}
              aria-label="Fjern fra kø"
            >
              <TrashIcon size={20} />
            </button>
          </div>
        )}

        {/* Swipeable content */}
        <div
          ref={swipeContentRef}
          className={styles.swipeContent}
          style={isSwipedOpen ? { transform: 'translateX(-80px)' } : undefined}
        >
          {/* Drag handle button */}
          {isDraggable && (
            <button
              className={styles.dragHandle}
              onMouseDown={onDragMouseDown}
              onTouchStart={onDragTouchStart}
              onTouchMove={onDragTouchMove}
              onTouchEnd={onDragTouchEnd}
              aria-label="Dra for å endre rekkefølge"
            >
              <GripVerticalIcon size={18} aria-hidden="true" />
            </button>
          )}

          {/* Cover art with play overlay */}
          <button
            className={styles.imageButton}
            onClick={handleImageClick}
            aria-label={`Spill ${episode.title}`}
          >
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt=""
                className={styles.image}
                loading="lazy"
                onError={handleImageError}
              />
            ) : (
              <div className={styles.placeholderImage} aria-hidden="true">
                🎙️
              </div>
            )}
            <div className={styles.playOverlay}>
              <PlayIcon size={24} />
            </div>
          </button>

          {/* Episode info - clickable to expand */}
          <div
            className={styles.info}
            onClick={handleToggleExpand}
          >
            {showPodcastInfo && podcastName && (
              <p className={styles.podcastName}>{podcastName}</p>
            )}
            <p className={styles.episodeTitle}>{episode.title}</p>

            {/* Metadata */}
            <div className={styles.meta}>
              {episode.publishedAt && <span>{formatDateLong(episode.publishedAt)}</span>}
              {formatDuration(episode.duration) && (
                <span className={styles.duration}>{formatDuration(episode.duration)}</span>
              )}
              {FEATURES.SEASON_EPISODE_METADATA &&
                formatSeasonEpisode(episode.season, episode.episode) && (
                  <span>{formatSeasonEpisode(episode.season, episode.episode)}</span>
                )}
              {progress?.completed && (
                <span className={styles.completed}>
                  <CheckIcon size={14} aria-hidden="true" />
                  Hørt
                </span>
              )}
              {progress && !progress.completed && progress.progress > 1 && (
                <span className={styles.inProgress}>{Math.round(progress.progress)}%</span>
              )}
              <EpisodeBadges
                chaptersUrl={episode.chaptersUrl}
                transcriptUrl={episode.transcriptUrl}
              />
            </div>

            {/* Progress bar */}
            {progress && !progress.completed && progress.progress > 1 && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress.progress}%` }}
                  aria-label={`${Math.round(progress.progress)}% avspilt`}
                />
              </div>
            )}

            {/* Expandable description */}
            {episode.description && (
              <div className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
                <FormattedText text={episode.description} />
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  // Default variant: standardized minimal design
  return (
    <article
      className={`${styles.card} ${menuOpen ? styles.menuOpen : ''}`}
      role="listitem"
    >
      {/* Cover art with play overlay */}
      <button
        className={styles.imageButton}
        onClick={handleImageClick}
        aria-label={`Spill ${episode.title}`}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className={styles.placeholderImage} aria-hidden="true">
            🎙️
          </div>
        )}
        <div className={styles.playOverlay}>
          <PlayIcon size={24} />
        </div>
      </button>

      {/* Episode info - clickable to expand */}
      <div className={styles.content}>
        <div className={styles.header} onClick={handleToggleExpand}>
          {showPodcastInfo && podcastName && (
            <p className={styles.podcastName}>{podcastName}</p>
          )}
          <h3 className={styles.episodeTitle}>{episode.title}</h3>

          {/* Metadata */}
          <div className={styles.meta}>
            {episode.publishedAt && <span>{formatDateLong(episode.publishedAt)}</span>}
            {formatDuration(episode.duration) && (
              <span className={styles.duration}>{formatDuration(episode.duration)}</span>
            )}
            {FEATURES.SEASON_EPISODE_METADATA &&
              formatSeasonEpisode(episode.season, episode.episode) && (
                <span>{formatSeasonEpisode(episode.season, episode.episode)}</span>
              )}
            {progress?.completed && (
              <span className={styles.completed}>
                <CheckIcon size={14} aria-hidden="true" />
                Hørt
              </span>
            )}
            {progress && !progress.completed && progress.progress > 1 && (
              <span className={styles.inProgress}>{Math.round(progress.progress)}%</span>
            )}
            <EpisodeBadges
              chaptersUrl={episode.chaptersUrl}
              transcriptUrl={episode.transcriptUrl}
            />
          </div>

          {/* Progress bar */}
          {progress && !progress.completed && progress.progress > 1 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress.progress}%` }}
                aria-label={`${Math.round(progress.progress)}% avspilt`}
              />
            </div>
          )}

          {/* Expandable description */}
          {episode.description && (
            <div className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
              <FormattedText text={episode.description} />
            </div>
          )}
        </div>

        {/* Context menu (if add to queue or play next is available) */}
        {(onAddToQueue || onPlayNext) && (
          <div className={styles.actions}>
            <button
              ref={buttonRef}
              className={styles.menuButton}
              onClick={handleMenuClick}
              aria-label="Handlinger"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <MoreVerticalIcon size={20} />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                className={styles.menuDropdown}
                role="menu"
                onKeyDown={handleMenuKeyDown}
              >
                {onPlayNext && (
                  <button
                    className={styles.menuItem}
                    onClick={handlePlayNext}
                    role="menuitem"
                  >
                    Spill neste
                  </button>
                )}
                {onAddToQueue && !isInQueue && (
                  <button
                    className={styles.menuItem}
                    onClick={handleAddToQueue}
                    role="menuitem"
                  >
                    Legg til i kø
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
