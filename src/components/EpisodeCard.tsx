import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  /** Whether to hide podcast name link (e.g., already in PodcastDetailsView) */
  hidePodcastLink?: boolean;

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

  /** Long-press start handler for image button (queue variant) */
  onImageLongPressStart?: (e: React.TouchEvent | React.MouseEvent) => void;

  /** Long-press end handler for image button (queue variant) */
  onImageLongPressEnd?: (e: React.TouchEvent | React.MouseEvent) => void;

  /** Long-press start handler for info area (queue variant) */
  onInfoLongPressStart?: (e: React.TouchEvent | React.MouseEvent) => void;

  /** Long-press end handler for info area (queue variant) */
  onInfoLongPressEnd?: (e: React.TouchEvent | React.MouseEvent) => void;

  /** Callback when expand/collapse state changes (for virtualization re-measurement) */
  onExpandChange?: (expanded: boolean) => void;
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
  onSelectPodcast,
  onRemove,
  hidePodcastLink = false,
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
  onImageLongPressStart,
  onImageLongPressEnd,
  onInfoLongPressStart,
  onInfoLongPressEnd,
  onExpandChange,
}: EpisodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Determine image URL from episode or podcast info
  const imageUrl = episode.imageUrl || podcastInfo?.imageUrl;

  // Get podcast name
  const podcastName = podcastInfo?.title;

  // Update menu position when opened or window resizes
  useEffect(() => {
    if (!menuOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();

      // Position menu below button, aligned to the right edge of button
      // If menuRef is available, we can calculate exact width, otherwise estimate
      const menuWidth = menuRef.current?.offsetWidth || 0;

      setMenuPosition({
        top: rect.bottom + 4, // 4px gap below button
        left: rect.right - menuWidth, // Align right edge with button right edge
      });
    };

    // Initial position and after render (to get accurate menu width)
    updatePosition();
    // Small delay to ensure menu is rendered and we can get its width
    setTimeout(updatePosition, 0);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [menuOpen]);

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
    setIsExpanded((prev) => {
      const newExpanded = !prev;
      onExpandChange?.(newExpanded);
      return newExpanded;
    });
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

  const handlePodcastClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (podcastInfo?.id && onSelectPodcast) {
      onSelectPodcast(podcastInfo.id);
    }
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
          {/* Top row: image and info */}
          <div className={styles.topRow}>
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
              onTouchStart={onImageLongPressStart}
              onTouchEnd={onImageLongPressEnd}
              onTouchCancel={onImageLongPressEnd}
              onMouseDown={onImageLongPressStart}
              onMouseUp={onImageLongPressEnd}
              onMouseLeave={onImageLongPressEnd}
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

            {/* Episode info */}
            <div className={styles.info}>
              {/* Podcast name - separate clickable area */}
              {showPodcastInfo && podcastName && (
                hidePodcastLink || !onSelectPodcast || !podcastInfo?.id ? (
                  <p className={styles.podcastName}>{podcastName}</p>
                ) : (
                  <button
                    className={styles.podcastNameButton}
                    onClick={handlePodcastClick}
                    type="button"
                  >
                    {podcastName}
                  </button>
                )
              )}

              {/* Episode title - clickable to expand */}
              <p
                className={styles.episodeTitle}
                onClick={handleToggleExpand}
                onTouchStart={onInfoLongPressStart}
                onTouchEnd={onInfoLongPressEnd}
                onTouchCancel={onInfoLongPressEnd}
                onMouseDown={onInfoLongPressStart}
                onMouseUp={onInfoLongPressEnd}
                onMouseLeave={onInfoLongPressEnd}
              >
                {episode.title}
              </p>

              {/* Metadata - clickable to expand */}
              <div
                className={styles.meta}
                onClick={handleToggleExpand}
                onTouchStart={onInfoLongPressStart}
                onTouchEnd={onInfoLongPressEnd}
                onTouchCancel={onInfoLongPressEnd}
                onMouseDown={onInfoLongPressStart}
                onMouseUp={onInfoLongPressEnd}
                onMouseLeave={onInfoLongPressEnd}
              >
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

              {/* Progress bar - clickable to expand */}
              {progress && !progress.completed && progress.progress > 1 && (
                <div
                  className={styles.progressBar}
                  onClick={handleToggleExpand}
                  onTouchStart={onInfoLongPressStart}
                  onTouchEnd={onInfoLongPressEnd}
                  onTouchCancel={onInfoLongPressEnd}
                  onMouseDown={onInfoLongPressStart}
                  onMouseUp={onInfoLongPressEnd}
                  onMouseLeave={onInfoLongPressEnd}
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress.progress}%` }}
                    aria-label={`${Math.round(progress.progress)}% avspilt`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Expandable description - full width */}
          {episode.description && (
            <div className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
              <FormattedText text={episode.description} />
            </div>
          )}
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

      {/* Episode info */}
      <div className={styles.content}>
        <div className={styles.header}>
          {/* Podcast name - separate clickable area */}
          {showPodcastInfo && podcastName && (
            hidePodcastLink || !onSelectPodcast || !podcastInfo?.id ? (
              <p className={styles.podcastName}>{podcastName}</p>
            ) : (
              <button
                className={styles.podcastNameButton}
                onClick={handlePodcastClick}
                type="button"
              >
                {podcastName}
              </button>
            )
          )}

          {/* Episode title - clickable to expand */}
          <h3 className={styles.episodeTitle} onClick={handleToggleExpand}>
            {episode.title}
          </h3>

          {/* Metadata - clickable to expand */}
          <div className={styles.meta} onClick={handleToggleExpand}>
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

          {/* Progress bar - clickable to expand */}
          {progress && !progress.completed && progress.progress > 1 && (
            <div className={styles.progressBar} onClick={handleToggleExpand}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress.progress}%` }}
                aria-label={`${Math.round(progress.progress)}% avspilt`}
              />
            </div>
          )}
        </div>

        {/* Expandable description - full width */}
        {episode.description && (
          <div className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
            <FormattedText text={episode.description} />
          </div>
        )}

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

            {menuOpen && createPortal(
              <div
                ref={menuRef}
                className={styles.menuDropdown}
                style={{
                  position: 'fixed',
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
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
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </article>
  );
}
