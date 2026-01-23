import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 as SpinnerIcon } from 'lucide-react';
import type { Subscription, PlaybackPosition } from '../services/db';
import { getInProgressEpisodes } from '../services/db';
import type { Episode } from '../types/podcast';
import type { PlayingEpisode } from './AudioPlayer';
import { getEpisodesByFeedIds } from '../services/podcastIndex';
import { transformEpisodes } from '../services/podcastTransform';
import { usePlaybackProgress } from '../hooks/usePlaybackProgress';
import { PullToRefresh } from './PullToRefresh';
import { EpisodeCard } from './EpisodeCard';
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

// Cache key for home view episodes

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
  const lastFetchTimeRef = useRef<number>(0);
  const hasInitialLoadedRef = useRef<boolean>(false);
  const { getProgress } = usePlaybackProgress();

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
      // Update last fetch time
      lastFetchTimeRef.current = Date.now();
    } catch {
      setError('Kunne ikke hente nye episoder');
    } finally {
      setIsLoading(false);
    }
  }, [subscriptions]);

  useEffect(() => {
    // Only fetch on initial load if no data exists
    if (hasInitialLoadedRef.current) {
      return; // Already loaded, don't fetch again on re-mount
    }

    const now = Date.now();
    const cacheAge = now - lastFetchTimeRef.current;

    // Skip if we have episodes and cache is fresh (less than 10 minutes old)
    if (episodes.length > 0 && cacheAge < 600000) {
      hasInitialLoadedRef.current = true;
      return;
    }

    // Fetch new episodes only on first load or if cache is stale
    fetchRecentEpisodes();
    lastFetchTimeRef.current = now;
    hasInitialLoadedRef.current = true;
  }, [fetchRecentEpisodes, episodes.length]);

  const handlePlayEpisode = (episode: EpisodeWithSubscription) => {
    onPlayEpisode({
      ...episode,
      podcastTitle: episode.subscription.title,
      podcastImage: episode.subscription.imageUrl,
    });
  };

  const handleAddToQueue = (episode: EpisodeWithSubscription) => {
    onAddToQueue(episode, episode.subscription.title, episode.subscription.imageUrl);
  };

  const handlePlayNext = (episode: EpisodeWithSubscription) => {
    onPlayNext(episode, episode.subscription.title, episode.subscription.imageUrl);
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
    const progress = getProgress(episode.id);
    const displayProgress = showResumeProgress
      ? {
          position: showResumeProgress.position,
          duration: showResumeProgress.duration,
          progress: (showResumeProgress.position / showResumeProgress.duration) * 100,
          completed: false,
        }
      : progress;

    return (
      <li key={episode.id}>
        <EpisodeCard
          episode={episode}
          podcastInfo={{
            id: episode.subscription.podcastId,
            title: episode.subscription.title,
            imageUrl: episode.subscription.imageUrl,
          }}
          showPodcastInfo={true}
          progress={displayProgress}
          isInQueue={isInQueue(episode.id)}
          onPlay={() => handlePlayEpisode(episode)}
          onAddToQueue={() => handleAddToQueue(episode)}
          onPlayNext={() => handlePlayNext(episode)}
        />
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
          <ul className={styles.list} role="list">
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
          <ul className={styles.list} role="list">
            {episodes.map((episode) => renderEpisodeItem(episode))}
          </ul>
        </>
      )}
    </section>
  );
}

// Default export for lazy loading
export default HomeView;
