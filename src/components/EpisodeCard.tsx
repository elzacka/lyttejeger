import { useState, useRef, useEffect, memo } from 'react';
import {
  PodcastIcon,
  CheckIcon,
  MoreVerticalIcon,
  ListMusicIcon,
  ListPlusIcon,
  PlayIcon,
  ChapterListIcon,
  TranscriptIcon,
} from './icons';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlaybackProgress } from '../hooks/usePlaybackProgress';
import { formatDuration, formatDateLong, linkifyText } from '../utils/search';
import { FEATURES } from '../config/features';
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

interface EpisodeCardProps {
  episode: EpisodeWithPodcast;
  onPlay?: (episode: EpisodeWithPodcast) => void;
  onAddToQueue?: (episode: EpisodeWithPodcast) => void;
  onPlayNext?: (episode: EpisodeWithPodcast) => void;
  isInQueue?: boolean;
  progress?: PlaybackProgress | null;
  onSelectPodcast?: (podcastId: string) => void;
}

export const EpisodeCard = memo(function EpisodeCard({
  episode,
  onPlay,
  onAddToQueue,
  onPlayNext,
  isInQueue = false,
  progress,
  onSelectPodcast,
}: EpisodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'right' | 'left'>('right');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl;

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

  const playEpisode = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onPlay) {
      onPlay(episode);
    } else if (episode.audioUrl) {
      window.open(episode.audioUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleMenuClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Calculate menu position before opening
    // When positioned right:0, the dropdown extends left from the container's right edge
    // When positioned left:0, the dropdown extends right from the container's left edge
    if (!menuOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const menuWidth = 160; // min-width from CSS
      const viewportWidth = window.innerWidth;

      // Check if dropdown would overflow left when using right:0 positioning
      // Dropdown left edge = container.right - menuWidth
      const dropdownLeftEdgeIfRight = containerRect.right - menuWidth;
      const wouldOverflowLeft = dropdownLeftEdgeIfRight < 0;

      // Check if dropdown would overflow right when using left:0 positioning
      // Dropdown right edge = container.left + menuWidth
      const dropdownRightEdgeIfLeft = containerRect.left + menuWidth;
      const wouldOverflowRight = dropdownRightEdgeIfLeft > viewportWidth;

      // Default to right alignment, but use left if that would overflow
      // If both would overflow, prefer left (more common on right-aligned cards)
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

  const handlePodcastClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (episode.podcast && onSelectPodcast) {
      onSelectPodcast(episode.podcast.id);
    }
  };

  return (
    <article
      className={`${styles.item} ${menuOpen ? styles.menuOpen : ''}`}
      role="listitem"
      data-menu-open={menuOpen ? 'true' : undefined}
    >
      <div className={styles.episodeHeader}>
        <button
          className={styles.episodeToggle}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`episode-details-${episode.id}`}
        >
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
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
            {episode.podcast && <span className={styles.podcastName}>{episode.podcast.title}</span>}
            <span className={styles.episodeTitle}>{episode.title}</span>
            <div className={styles.meta}>
              <span>{formatDateLong(episode.publishedAt)}</span>
              {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
              {FEATURES.SEASON_EPISODE_METADATA &&
                formatSeasonEpisode(episode.season, episode.episode) && (
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
              {FEATURES.CHAPTERS && episode.chaptersUrl && (
                <span className={styles.p2pBadge} title="Har kapitler">
                  <ChapterListIcon size={12} aria-hidden="true" />
                </span>
              )}
              {FEATURES.TRANSCRIPTS && episode.transcriptUrl && (
                <span className={styles.p2pBadge} title="Har transkripsjon">
                  <TranscriptIcon size={12} aria-hidden="true" />
                </span>
              )}
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
          </div>
        </button>

        <div className={styles.actions}>
          {(onAddToQueue || onPlayNext) && (
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
                  onKeyDown={(e) => {
                    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
                    if (!items?.length) return;
                    const currentIndex = Array.from(items).findIndex(
                      (item) => item === document.activeElement
                    );
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                      (items[nextIndex] as HTMLElement).focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                      (items[prevIndex] as HTMLElement).focus();
                    }
                  }}
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
          )}
          <button
            className={styles.playButton}
            onClick={playEpisode}
            aria-label={`Spill ${episode.title}`}
          >
            <PlayIcon size={20} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id={`episode-details-${episode.id}`} className={styles.episodeDetails}>
          {episode.podcast && onSelectPodcast && (
            <button className={styles.podcastLink} onClick={handlePodcastClick}>
              Gå til {episode.podcast.title}
            </button>
          )}
          {episode.description ? (
            <p className={styles.episodeDescription}>
              {linkifyText(episode.description).map((part, idx) =>
                part.type === 'link' ? (
                  <a
                    key={idx}
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.descriptionLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part.content}
                  </a>
                ) : (
                  <span key={idx}>{part.content}</span>
                )
              )}
            </p>
          ) : (
            <p className={styles.noDescription}>Ingen beskrivelse tilgjengelig</p>
          )}
        </div>
      )}
    </article>
  );
});
