/**
 * Shared episode metadata display (date, duration, progress, badges)
 * Used by both default and queue variants of EpisodeCard
 */

import { Check as CheckIcon } from 'lucide-react';
import type { Episode } from '../../types/podcast';
import type { PlaybackProgress } from '../../hooks/usePlaybackProgress';
import { formatDuration, formatDateLong } from '../../utils/search';
import { FEATURES } from '../../config/features';
import { EpisodeBadges } from '../EpisodeBadges';
import styles from '../EpisodeCard.module.css';

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

interface EpisodeMetadataProps {
  episode: Episode;
  progress?: PlaybackProgress | null;
  onClick?: () => void;
  // Long press handlers for queue variant
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onTouchCancel?: (e: React.TouchEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export function EpisodeMetadata({
  episode,
  progress,
  onClick,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: EpisodeMetadataProps) {
  const seasonEpisode = formatSeasonEpisode(episode.season, episode.episode);

  return (
    <div
      className={styles.meta}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {episode.publishedAt && <span>{formatDateLong(episode.publishedAt)}</span>}
      {formatDuration(episode.duration) && (
        <span className={styles.duration}>{formatDuration(episode.duration)}</span>
      )}
      {FEATURES.SEASON_EPISODE_METADATA && seasonEpisode && <span>{seasonEpisode}</span>}
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
  );
}

interface EpisodeProgressBarProps {
  progress?: PlaybackProgress | null;
  onClick?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onTouchCancel?: (e: React.TouchEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export function EpisodeProgressBar({
  progress,
  onClick,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: EpisodeProgressBarProps) {
  if (!progress || progress.completed || progress.progress <= 1) {
    return null;
  }

  return (
    <div
      className={styles.progressBar}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={styles.progressFill}
        style={{ width: `${progress.progress}%` }}
        aria-label={`${Math.round(progress.progress)}% avspilt`}
      />
    </div>
  );
}
