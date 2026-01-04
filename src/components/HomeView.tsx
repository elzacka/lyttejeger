import { useState, useEffect, useCallback } from 'react';
import {
  SpinnerIcon,
  CheckIcon,
  MoreVerticalIcon,
  ListMusicIcon,
  ListPlusIcon,
  PlayIcon,
} from './icons';
import type { Subscription, PlaybackPosition } from '../services/db';
import { getInProgressEpisodes } from '../services/db';
import type { Episode } from '../types/podcast';
import type { PlayingEpisode } from './AudioPlayer';
import { getEpisodesByFeedIds } from '../services/podcastIndex';
import { transformEpisodes } from '../services/podcastTransform';
import { formatDuration, formatDateLong, linkifyText } from '../utils/search';
import { usePlaybackProgress } from '../hooks/usePlaybackProgress';
import { PullToRefresh } from './PullToRefresh';
import { EpisodeBadges } from './EpisodeBadges';
import { RECENT_EPISODES_MS, MAX_EPISODES_PER_REQUEST, MS_PER_SECOND } from '../constants';
import styles from './HomeView.module.css';

interface HomeViewProps {
  subscriptions: Subscription[];
  onPlayEpisode: (episode: PlayingEpisode) => void;
  onAddToQueue: (episode: Episode, podcastTitle: string, podcastImage: string) => void;
  onPlayNext: (episode: Episode, podcastTitle: string, podcastImage: string) => void;
  isInQueue: (episodeId: string) => boolean;
  onNavigateToSearch?: () => void;
}

interface EpisodeWithSubscription extends Episode {
  subscription: Subscription;
}

interface InProgressEpisode extends EpisodeWithSubscription {
  playbackPosition: PlaybackPosition;
}

export function HomeView({
  subscriptions,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
  onNavigateToSearch,
}: HomeViewProps) {
  const [episodes, setEpisodes] = useState<EpisodeWithSubscription[]>([]);
  const [inProgressEpisodes, setInProgressEpisodes] = useState<InProgressEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);
  const { getProgress } = usePlaybackProgress();

  const toggleEpisodeExpand = useCallback((episodeId: string) => {
    setExpandedEpisodeId((prev) => (prev === episodeId ? null : episodeId));
  }, []);

  const fetchRecentEpisodes = useCallback(async () => {
    if (subscriptions.length === 0) {
      setEpisodes([]);
      setInProgressEpisodes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const recentCutoff = Date.now() - RECENT_EPISODES_MS;

      // Build subscription lookup map
      const subMap = new Map<string, Subscription>();
      const feedIds: number[] = [];

      for (const sub of subscriptions) {
        const feedId = parseInt(sub.podcastId);
        if (!isNaN(feedId)) {
          feedIds.push(feedId);
          subMap.set(sub.podcastId, sub);
        }
      }

      // Fetch episodes and in-progress positions in parallel
      const [res, inProgressPositions] = await Promise.all([
        getEpisodesByFeedIds(feedIds, {
          max: MAX_EPISODES_PER_REQUEST,
          since: Math.floor(recentCutoff / MS_PER_SECOND),
        }),
        getInProgressEpisodes(),
      ]);

      const transformed = transformEpisodes(res.items || []);

      // Build episode lookup map for matching in-progress positions
      const episodeMap = new Map<string, Episode>();
      for (const ep of transformed) {
        episodeMap.set(ep.id, ep);
      }

      // Filter to recent episodes and attach subscription info
      const allEpisodes: EpisodeWithSubscription[] = transformed
        .filter((ep) => {
          const pubDate = new Date(ep.publishedAt).getTime();
          return pubDate >= recentCutoff;
        })
        .map((ep) => {
          const subscription = subMap.get(ep.podcastId)!;
          return { ...ep, subscription };
        })
        .filter((ep) => ep.subscription); // Safety check

      // Sort by publish date, newest first
      allEpisodes.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
      });

      // Match in-progress positions with episode data
      // Only include episodes we have full data for (from current subscriptions)
      const inProgress: InProgressEpisode[] = [];
      for (const pos of inProgressPositions) {
        const episode = episodeMap.get(pos.episodeId);
        if (episode) {
          const subscription = subMap.get(episode.podcastId);
          if (subscription) {
            inProgress.push({
              ...episode,
              subscription,
              playbackPosition: pos,
            });
          }
        }
      }

      setEpisodes(allEpisodes);
      setInProgressEpisodes(inProgress);
    } catch {
      setError('Kunne ikke hente nye episoder');
    } finally {
      setIsLoading(false);
    }
  }, [subscriptions]);

  useEffect(() => {
    fetchRecentEpisodes();
  }, [fetchRecentEpisodes]);

  const handlePlayEpisode = (episode: EpisodeWithSubscription, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    onPlayEpisode({
      ...episode,
      podcastTitle: episode.subscription.title,
      podcastImage: episode.subscription.imageUrl,
    });
  };

  if (subscriptions.length === 0) {
    return (
      <section className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Ingen abonnementer enda</p>
          {onNavigateToSearch && (
            <button className={styles.ctaButton} onClick={onNavigateToSearch}>
              Finn podkaster
            </button>
          )}
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Siste 7 dager</h2>
        <div className={styles.loading}>
          <SpinnerIcon size={24} className={styles.spinner} />
          <span>Henter nye episoder...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Siste 7 dager</h2>
        <p className={styles.error}>{error}</p>
      </section>
    );
  }

  if (episodes.length === 0 && inProgressEpisodes.length === 0) {
    return (
      <section className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Ingen nye episoder siste 7 dager</p>
        </div>
      </section>
    );
  }

  const renderEpisodeItem = (
    episode: EpisodeWithSubscription,
    showResumeProgress?: { position: number; duration: number }
  ) => {
    const isMenuOpen = menuOpenId === episode.id;
    const isExpanded = expandedEpisodeId === episode.id;
    const progress = getProgress(episode.id);
    const displayProgress = showResumeProgress
      ? {
          progress: (showResumeProgress.position / showResumeProgress.duration) * 100,
          completed: false,
        }
      : progress;

    return (
      <li key={episode.id} className={`${styles.item} ${isMenuOpen ? styles.menuOpen : ''}`}>
        <div className={styles.episodeHeader}>
          <button
            className={styles.episodeToggle}
            onClick={() => toggleEpisodeExpand(episode.id)}
            aria-expanded={isExpanded}
            aria-controls={`episode-details-${episode.id}`}
          >
            <img
              src={episode.subscription.imageUrl}
              alt=""
              className={styles.image}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className={styles.info}>
              <span className={styles.podcastName}>{episode.subscription.title}</span>
              <span className={styles.episodeTitle}>{episode.title}</span>
              <div className={styles.meta}>
                <span>{formatDateLong(episode.publishedAt)}</span>
                {formatDuration(episode.duration) && (
                  <span>{formatDuration(episode.duration)}</span>
                )}
                {displayProgress?.completed && (
                  <span className={styles.completed}>
                    <CheckIcon size={14} aria-hidden="true" />
                    Hørt
                  </span>
                )}
                {displayProgress && !displayProgress.completed && displayProgress.progress > 1 && (
                  <span className={styles.inProgress}>{Math.round(displayProgress.progress)}%</span>
                )}
                <EpisodeBadges
                  chaptersUrl={episode.chaptersUrl}
                  transcriptUrl={episode.transcriptUrl}
                />
              </div>
              {displayProgress && !displayProgress.completed && displayProgress.progress > 1 && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${displayProgress.progress}%` }}
                  />
                </div>
              )}
            </div>
          </button>
          <div className={styles.actions}>
            <div className={styles.menuContainer}>
              <button
                className={styles.menuButton}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMenuOpenId(menuOpenId === episode.id ? null : episode.id);
                }}
                aria-label="Flere valg"
                aria-expanded={isMenuOpen}
              >
                <MoreVerticalIcon size={20} />
              </button>
              {isMenuOpen && (
                <div className={styles.menuDropdown}>
                  <button
                    className={styles.menuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onPlayNext(
                        episode,
                        episode.subscription.title,
                        episode.subscription.imageUrl
                      );
                      setMenuOpenId(null);
                    }}
                  >
                    <ListMusicIcon size={18} />
                    Spill neste
                  </button>
                  <button
                    className={styles.menuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onAddToQueue(
                        episode,
                        episode.subscription.title,
                        episode.subscription.imageUrl
                      );
                      setMenuOpenId(null);
                    }}
                    disabled={isInQueue(episode.id)}
                  >
                    <ListPlusIcon size={18} />
                    {isInQueue(episode.id) ? 'I køen' : 'Legg til i kø'}
                  </button>
                </div>
              )}
            </div>
            <button
              className={styles.playButton}
              onClick={(e) => handlePlayEpisode(episode, e)}
              aria-label={`Spill ${episode.title}`}
            >
              <PlayIcon size={20} />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div id={`episode-details-${episode.id}`} className={styles.episodeDetails}>
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
      </li>
    );
  };

  return (
    <section className={styles.container}>
      <PullToRefresh onRefresh={fetchRecentEpisodes} disabled={isLoading} />

      {inProgressEpisodes.length > 0 && (
        <>
          <h2 className={styles.title}>
            Fortsett å lytte
            <span className={styles.badge}>{inProgressEpisodes.length}</span>
          </h2>
          <ul className={styles.list}>
            {inProgressEpisodes.map((episode) =>
              renderEpisodeItem(episode, {
                position: episode.playbackPosition.position,
                duration: episode.playbackPosition.duration,
              })
            )}
          </ul>
        </>
      )}

      {episodes.length > 0 && (
        <>
          <h2
            className={`${styles.title} ${inProgressEpisodes.length > 0 ? styles.sectionDivider : ''}`}
          >
            Siste 7 dager
            <span className={styles.badge}>{episodes.length}</span>
          </h2>
          <ul className={styles.list}>{episodes.map((episode) => renderEpisodeItem(episode))}</ul>
        </>
      )}
    </section>
  );
}
