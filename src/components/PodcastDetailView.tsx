import { useEffect, useState } from 'react';
import { ArrowLeft as ArrowLeftIcon, Podcast as PodcastIcon, Star as StarIcon, Heart as HeartIcon } from 'lucide-react';
import type { Podcast, Episode } from '../types/podcast';
import type { PlayingEpisode } from './AudioPlayer';
import type { PlaybackProgress } from '../hooks/usePlaybackProgress';
import { getEpisodesByFeedId } from '../services/podcastIndex';
import { transformEpisodes } from '../services/podcastTransform';
import { formatDateShort } from '../utils/search';
import { FormattedText } from './FormattedText';
import { translateCategory } from '../utils/categoryTranslations';
import { EpisodeCard } from './EpisodeCard';
import styles from './PodcastDetailView.module.css';

interface PodcastDetailViewProps {
  podcast: Podcast;
  onPlayEpisode: (episode: PlayingEpisode) => void;
  onAddToQueue?: (episode: Episode, podcastTitle: string, podcastImage: string) => void;
  onPlayNext?: (episode: Episode, podcastTitle: string, podcastImage: string) => void;
  isInQueue?: (episodeId: string) => boolean;
  getProgress?: (episodeId: string) => PlaybackProgress | null;
  isSubscribed?: boolean;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
  onBack?: () => void;
}

export function PodcastDetailView({
  podcast,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
  getProgress,
  isSubscribed,
  onSubscribe,
  onUnsubscribe,
  onBack,
}: PodcastDetailViewProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [episodesError, setEpisodesError] = useState<string | null>(null);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const EPISODES_PER_PAGE = 100;

  useEffect(() => {
    const fetchEpisodes = async () => {
      setIsLoadingEpisodes(true);
      setEpisodesError(null);
      setHasMoreEpisodes(false);

      try {
        const feedId = parseInt(podcast.id);
        if (isNaN(feedId)) {
          throw new Error('Invalid podcast ID');
        }

        const res = await getEpisodesByFeedId(feedId, { max: EPISODES_PER_PAGE });
        const transformedEpisodes = transformEpisodes(res.items || []);
        setEpisodes(transformedEpisodes);
        // Check if there might be more episodes
        setHasMoreEpisodes(
          transformedEpisodes.length >= EPISODES_PER_PAGE &&
            podcast.episodeCount > transformedEpisodes.length
        );
      } catch {
        setEpisodesError('Kunne ikke hente episodene. Prøv igjen.');
      } finally {
        setIsLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [podcast.id, podcast.episodeCount]);

  const loadMoreEpisodes = async () => {
    if (isLoadingMore || !hasMoreEpisodes) return;

    setIsLoadingMore(true);
    try {
      const feedId = parseInt(podcast.id);
      // Fetch all episodes up to a higher limit
      const newMax = episodes.length + EPISODES_PER_PAGE;
      const res = await getEpisodesByFeedId(feedId, { max: newMax });
      const allEpisodes = transformEpisodes(res.items || []);

      // Filter to only include episodes we don't already have
      const existingIds = new Set(episodes.map((e) => e.id));
      const newEpisodes = allEpisodes.filter((e) => !existingIds.has(e.id));

      if (newEpisodes.length > 0) {
        setEpisodes((prev) => [...prev, ...newEpisodes]);
      }

      // Check if we've loaded all episodes
      setHasMoreEpisodes(allEpisodes.length >= newMax && allEpisodes.length < podcast.episodeCount);
    } catch {
      // Silently fail - user can try again
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    onPlayEpisode({
      ...episode,
      podcastTitle: podcast.title,
      podcastImage: podcast.imageUrl,
    });
  };

  const handleAddToQueue = (episode: Episode) => {
    onAddToQueue?.(episode, podcast.title, podcast.imageUrl);
  };

  const handlePlayNext = (episode: Episode) => {
    onPlayNext?.(episode, podcast.title, podcast.imageUrl);
  };

  return (
    <div className={styles.page}>
      {onBack && (
        <header className={styles.header}>
          <button className={styles.backButton} onClick={onBack} aria-label="Tilbake">
            <ArrowLeftIcon size={20} />
          </button>
        </header>
      )}

      <div className={styles.content}>
        <section className={styles.podcastInfo}>
          {imageError ? (
            <div className={`${styles.image} image-placeholder`}>
              <PodcastIcon size={48} aria-hidden="true" />
            </div>
          ) : (
            <img
              src={podcast.imageUrl}
              alt={`Omslagsbilde for ${podcast.title}`}
              className={styles.image}
              loading="eager"
              onError={() => setImageError(true)}
            />
          )}
          <div className={styles.infoContent}>
            <h2 className={styles.title}>{podcast.title}</h2>
            <p className={styles.author}>{podcast.author}</p>
            <div className={styles.rating}>
              <StarIcon size={16} style={{ color: 'var(--color-warning)' }} />
              <span>{podcast.rating.toFixed(1)}</span>
            </div>
          </div>
          {(onSubscribe || onUnsubscribe) && (
            <button
              className={`${styles.subscribeButton} ${isSubscribed ? styles.subscribed : ''}`}
              onClick={isSubscribed ? onUnsubscribe : onSubscribe}
              aria-pressed={isSubscribed}
              aria-label={isSubscribed ? 'Slutt å følge' : 'Følg podcast'}
              title={isSubscribed ? 'Slutt å følge' : 'Følg'}
            >
              <HeartIcon
                size={14}
                fill={isSubscribed ? 'currentColor' : 'none'}
                strokeWidth={isSubscribed ? 0 : 2}
              />
            </button>
          )}
        </section>

        {podcast.description && (
          <section className={styles.description}>
            <p
              className={`${styles.descriptionText} ${isDescriptionExpanded ? styles.descriptionExpanded : ''}`}
            >
              <FormattedText text={podcast.description} />
            </p>
            {podcast.description.length > 200 && (
              <button
                className={styles.expandButton}
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
              >
                {isDescriptionExpanded ? 'Vis mindre' : 'Vis mer'}
              </button>
            )}
          </section>
        )}

        <section className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Episoder</span>
            <span className={styles.metaValue}>{podcast.episodeCount}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Sist oppdatert</span>
            <span className={styles.metaValue}>{formatDateShort(podcast.lastUpdated)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Språk</span>
            <span className={styles.metaValue}>{podcast.language}</span>
          </div>
        </section>

        <section className={styles.categories}>
          {podcast.categories.map((category) => (
            <span key={category} className={styles.category}>
              {translateCategory(category)}
            </span>
          ))}
        </section>

        <section className={styles.episodesSection}>
          <h3 className={styles.episodesTitle}>Episoder</h3>

          {isLoadingEpisodes && (
            <div className={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonItem}>
                  <div className={`skeleton ${styles.skeletonTitle}`} />
                  <div className={`skeleton ${styles.skeletonMeta}`} />
                </div>
              ))}
            </div>
          )}

          {episodesError && <p className={styles.error}>{episodesError}</p>}

          {!isLoadingEpisodes && !episodesError && episodes.length === 0 && (
            <p className={styles.noEpisodes}>Fant ingen episoder</p>
          )}

          {!isLoadingEpisodes && episodes.length > 0 && (
            <ul className={styles.episodeList} role="list">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <EpisodeCard
                    episode={episode}
                    showPodcastInfo={false}
                    progress={getProgress?.(episode.id)}
                    onPlay={handlePlayEpisode}
                    onAddToQueue={onAddToQueue ? handleAddToQueue : undefined}
                    onPlayNext={onPlayNext ? handlePlayNext : undefined}
                    isInQueue={isInQueue?.(episode.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {hasMoreEpisodes && (
            <button
              className={styles.loadMoreButton}
              onClick={loadMoreEpisodes}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Laster...' : `Last inn flere episoder`}
            </button>
          )}

          {!isLoadingEpisodes && episodes.length > 0 && (
            <p className={styles.episodeCount}>
              Viser {episodes.length} av {podcast.episodeCount} episoder
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// Default export for lazy loading
export default PodcastDetailView;
