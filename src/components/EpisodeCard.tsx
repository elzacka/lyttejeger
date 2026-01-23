import { useState, useRef, useEffect } from 'react';
import {
  Podcast as PodcastIcon,
  Check as CheckIcon,
  MoreVertical as MoreVerticalIcon,
  ListMusic as ListMusicIcon,
  ListPlus as ListPlusIcon,
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
 * Either comes from episode.podcast or from a subscription
 */
export interface EpisodePodcastInfo {
  id: string;
  title: string;
  imageUrl?: string;
}

/**
 * Unified EpisodeCard props interface
 * Supports all use cases: SearchView, PodcastDetailView, HomeView, QueueView
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

  // --- Layout variants ---

  /** Hide the expand/collapse functionality */
  hideExpand?: boolean;

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
  hideExpand = false,
  variant = 'default',
}: EpisodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'right' | 'left'>('right');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleToggleExpand = () => {
    if (!hideExpand) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleMenuClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Calculate menu position before opening
    if (!menuOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const menuWidth = 160;
      const viewportWidth = window.innerWidth;

      const dropdownLeftEdgeIfRight = containerRect.right - menuWidth;
      const wouldOverflowLeft = dropdownLeftEdgeIfRight < 0;

      const dropdownRightEdgeIfLeft = containerRect.left + menuWidth;
      const wouldOverflowRight = dropdownRightEdgeIfLeft > viewportWidth;

      if (wouldOverflowLeft && !wouldOverflowRight) {
        setMenuPosition('left');
      } else {
        setMenuPosition('right');
      }
    }

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

  // Render image with integrated play button (and drag handle for queue)
  const renderImage = () => {
    return (
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
          <div className={`${styles.image} image-placeholder`}>
            <PodcastIcon size={24} aria-hidden="true" />
          </div>
        )}
        <div className={styles.playOverlay}>
          <PlayIcon size={20} aria-hidden="true" />
        </div>
      </button>
    );
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (!progress || progress.completed || progress.progress <= 1) return null;
    return (
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress.progress}%` }}
          aria-label={`${Math.round(progress.progress)}% avspilt`}
        />
      </div>
    );
  };

  // Render metadata line
  const renderMeta = () => (
    <div className={styles.meta}>
      <span>{formatDateLong(episode.publishedAt)}</span>
      {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
      {FEATURES.SEASON_EPISODE_METADATA && formatSeasonEpisode(episode.season, episode.episode) && (
        <span className={styles.seasonEpisode}>
          {formatSeasonEpisode(episode.season, episode.episode)}
        </span>
      )}
      {FEATURES.SEASON_EPISODE_METADATA &&
        episode.episodeType &&
        episode.episodeType !== 'full' && (
          <span className={styles.episodeTypeBadge}>{episode.episodeType}</span>
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
      {isInQueue && <span className={styles.inQueue}>I kø</span>}
      <EpisodeBadges chaptersUrl={episode.chaptersUrl} transcriptUrl={episode.transcriptUrl} />
    </div>
  );

  // Render menu dropdown
  const renderMenu = () => {
    if (!onAddToQueue && !onPlayNext) return null;

    return (
      <div ref={containerRef} className={styles.menuContainer}>
        <button
          ref={buttonRef}
          className={styles.menuButton}
          onClick={handleMenuClick}
          aria-label="Flere valg"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVerticalIcon size={20} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className={`${styles.menuDropdown} ${menuPosition === 'left' ? styles.menuDropdownLeft : ''}`}
            role="menu"
            onKeyDown={handleMenuKeyDown}
          >
            {onPlayNext && (
              <button className={styles.menuItem} onClick={handlePlayNext} role="menuitem">
                <ListMusicIcon size={18} />
                Spill neste
              </button>
            )}
            {onAddToQueue && !isInQueue && (
              <button className={styles.menuItem} onClick={handleAddToQueue} role="menuitem">
                <ListPlusIcon size={18} />
                Legg til i kø
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render description with line-clamp
  const renderDescription = () => {
    if (!episode.description || hideExpand) return null;

    return (
      <div className={`${styles.episodeDescription} ${isExpanded ? styles.expanded : ''}`}>
        <FormattedText text={episode.description} />
        {!hideExpand && (
          <span className={styles.expandIndicator}>
            {isExpanded ? ' ↑' : ' ↓'}
          </span>
        )}
      </div>
    );
  };

  // Render play button for actions section
  const renderPlayButton = () => {
    return (
      <button
        className={styles.playButton}
        onClick={handlePlay}
        aria-label={`Spill ${episode.title}`}
      >
        <PlayIcon size={18} />
      </button>
    );
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
          style={isSwipedOpen ? { transform: 'translateX(-60px)' } : undefined}
        >
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

            {showPodcastInfo && renderImage()}

            <div className={styles.content} onClick={handleToggleExpand}>
              {showPodcastInfo && podcastName && (
                <p className={styles.podcastName}>{podcastName}</p>
              )}
              <p className={styles.episodeTitle}>{episode.title}</p>
              <div className={styles.meta}>
                {episode.publishedAt && <span>{formatDateLong(episode.publishedAt)}</span>}
                {formatDuration(episode.duration) && (
                  <span className={styles.duration}>{formatDuration(episode.duration)}</span>
                )}
                {FEATURES.SEASON_EPISODE_METADATA &&
                  formatSeasonEpisode(episode.season, episode.episode) && (
                    <span className={styles.seasonEpisode}>
                      {formatSeasonEpisode(episode.season, episode.episode)}
                    </span>
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
              {progress && !progress.completed && progress.progress > 1 && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress.progress}%` }}
                    aria-label={`${Math.round(progress.progress)}% avspilt`}
                  />
                </div>
              )}
              {renderDescription()}
            </div>

            {/* No actions section in queue variant - use swipe-to-delete */}
          </div>
        </div>
      </article>
    );
  }

  // Default variant: compact card with inline footer
  return (
    <article
      className={`${styles.item} ${menuOpen ? styles.menuOpen : ''}`}
      role="listitem"
      data-menu-open={menuOpen ? 'true' : undefined}
    >
      <div className={styles.episodeHeader}>
        <div className={styles.episodeToggle} onClick={handleToggleExpand}>
          {showPodcastInfo && renderImage()}

          <div className={styles.info}>
            {showPodcastInfo && podcastName && (
              <span className={styles.podcastName}>{podcastName}</span>
            )}
            <span className={styles.episodeTitle}>{episode.title}</span>
            {renderMeta()}
            {renderProgressBar()}
            {renderDescription()}
          </div>
        </div>

        <div className={styles.actions}>
          {!showPodcastInfo && renderPlayButton()}
          {renderMenu()}
        </div>
      </div>
    </article>
  );
}
