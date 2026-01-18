import { useState, useEffect, useCallback } from 'react';
import { PodcastIcon, PlayIcon, RefreshIcon, SpinnerIcon, ChevronIcon } from './icons';
import {
  getRecentEpisodes,
  getEpisodesByFeedId,
  getPodcastByFeedId,
  getEpisodeById,
} from '../services/podcastIndex';
import { transformEpisode } from '../services/podcastTransform';
import { formatDuration, formatDateLong } from '../utils/search';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlayingEpisode } from './AudioPlayer';
import { CURATED_PODCASTS, CURATED_EPISODES, DISCOVERY_MODE } from '../data/curatedContent';
import { FormattedText } from './FormattedText';
import styles from './RandomDiscovery.module.css';

// Allowed language prefixes for random discovery (Nordic + English)
const ALLOWED_LANG_PREFIXES = ['no', 'nb', 'nn', 'en', 'da', 'sv'];

/**
 * Check if a language code is in our allowed list
 * Handles various formats: "en", "en-US", "en_US", etc.
 */
function isAllowedLanguage(lang: string | undefined | null): boolean {
  if (!lang) return false;
  // Normalize: lowercase, take first part before - or _
  const normalized = lang.toLowerCase().split(/[-_]/)[0];
  return ALLOWED_LANG_PREFIXES.includes(normalized);
}

interface RandomDiscoveryProps {
  onPlayEpisode: (episode: PlayingEpisode) => void;
  onSelectPodcastById?: (podcastId: string) => void;
}

export function RandomDiscovery({ onPlayEpisode, onSelectPodcastById }: RandomDiscoveryProps) {
  const [episode, setEpisode] = useState<EpisodeWithPodcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurated, setIsCurated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch the first (oldest) episode from a curated podcast
  // Many curated podcasts are series, so we always show the first episode
  const fetchFromCuratedPodcast = useCallback(async (): Promise<EpisodeWithPodcast | null> => {
    if (CURATED_PODCASTS.length === 0) return null;

    // Pick a random curated podcast
    const randomPodcast = CURATED_PODCASTS[Math.floor(Math.random() * CURATED_PODCASTS.length)];

    try {
      // Fetch all episodes (max 1000) to find the oldest one
      const episodesRes = await getEpisodesByFeedId(randomPodcast.feedId, { max: 1000 });
      if (!episodesRes.items || episodesRes.items.length === 0) return null;

      // Find the oldest episode (smallest datePublished)
      const oldestEp = episodesRes.items.reduce((oldest, current) => {
        const oldestDate = oldest.datePublished || 0;
        const currentDate = current.datePublished || 0;
        return currentDate < oldestDate ? current : oldest;
      });
      const transformed = transformEpisode(oldestEp);

      // Fetch podcast info
      const podcastRes = await getPodcastByFeedId(randomPodcast.feedId);
      const feed = podcastRes.feed;

      return {
        ...transformed,
        podcast: {
          id: randomPodcast.feedId.toString(),
          title: feed?.title || oldestEp.feedTitle || 'Ukjent podcast',
          author: feed?.author || '',
          description: feed?.description || '',
          imageUrl: feed?.image || oldestEp.feedImage || '/placeholder-podcast.svg',
          feedUrl: feed?.url || '',
          categories: [],
          language: feed?.language || '',
          episodeCount: feed?.episodeCount || 0,
          lastUpdated: new Date().toISOString(),
          rating: 3,
          explicit: feed?.explicit || false,
        },
      };
    } catch {
      return null;
    }
  }, []);

  // Fetch a specific curated episode by Podcast Index episode ID
  const fetchCuratedEpisode = useCallback(async (): Promise<EpisodeWithPodcast | null> => {
    if (CURATED_EPISODES.length === 0) return null;

    // Pick a random curated episode
    const randomCurated = CURATED_EPISODES[Math.floor(Math.random() * CURATED_EPISODES.length)];

    try {
      const episodeRes = await getEpisodeById(randomCurated.episodeId);
      if (!episodeRes.episode) return null;

      const apiEp = episodeRes.episode;
      const transformed = transformEpisode(apiEp);

      // Fetch podcast info
      const podcastRes = await getPodcastByFeedId(apiEp.feedId);
      const feed = podcastRes.feed;

      return {
        ...transformed,
        podcast: {
          id: apiEp.feedId.toString(),
          title: feed?.title || apiEp.feedTitle || 'Ukjent podcast',
          author: feed?.author || '',
          description: feed?.description || '',
          imageUrl: feed?.image || apiEp.feedImage || '/placeholder-podcast.svg',
          feedUrl: feed?.url || '',
          categories: [],
          language: feed?.language || '',
          episodeCount: feed?.episodeCount || 0,
          lastUpdated: new Date().toISOString(),
          rating: 3,
          explicit: feed?.explicit || false,
        },
      };
    } catch {
      return null;
    }
  }, []);

  // Fetch random episode from API (original behavior)
  const fetchRandomFromApi = useCallback(async (): Promise<EpisodeWithPodcast | null> => {
    const response = await getRecentEpisodes({ max: 1000 });

    if (!response.items || response.items.length === 0) return null;

    // Strictly filter to only allowed languages
    const filteredEpisodes = response.items.filter((ep) => isAllowedLanguage(ep.feedLanguage));
    if (filteredEpisodes.length === 0) return null;

    // Pick a random episode
    const randomIndex = Math.floor(Math.random() * filteredEpisodes.length);
    const apiEpisode = filteredEpisodes[randomIndex];
    const transformed = transformEpisode(apiEpisode);

    return {
      ...transformed,
      podcast: {
        id: apiEpisode.feedId.toString(),
        title: apiEpisode.feedTitle || 'Ukjent podcast',
        author: apiEpisode.feedAuthor || '',
        description: '',
        imageUrl: apiEpisode.feedImage || '/placeholder-podcast.svg',
        feedUrl: '',
        categories: [],
        language: apiEpisode.feedLanguage || '',
        episodeCount: 0,
        lastUpdated: new Date().toISOString(),
        rating: 3,
        explicit: false,
      },
    };
  }, []);

  const fetchRandomEpisode = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setIsExpanded(false);

      try {
        let result: EpisodeWithPodcast | null = null;
        let fromCurated = false;

        // Velg kilde basert på DISCOVERY_MODE
        switch (DISCOVERY_MODE) {
          case 'random':
            // Variant 1: Kun tilfeldige fra API
            result = await fetchRandomFromApi();
            break;

          case 'podcasts':
            // Variant 2: Kun kuraterte podcaster (første episode)
            if (CURATED_PODCASTS.length > 0) {
              result = await fetchFromCuratedPodcast();
              fromCurated = true;
            }
            break;

          case 'episodes':
            // Variant 3: Kun kuraterte episoder
            if (CURATED_EPISODES.length > 0) {
              result = await fetchCuratedEpisode();
              fromCurated = true;
            }
            break;

          case 'podcasts-episodes':
            // Variant 4: Mix av kuraterte podcaster og episoder
            if (CURATED_EPISODES.length > 0 && CURATED_PODCASTS.length > 0) {
              // 50/50 sjanse for podcast vs episode
              if (Math.random() < 0.5) {
                result = await fetchCuratedEpisode();
              } else {
                result = await fetchFromCuratedPodcast();
              }
            } else if (CURATED_EPISODES.length > 0) {
              result = await fetchCuratedEpisode();
            } else if (CURATED_PODCASTS.length > 0) {
              result = await fetchFromCuratedPodcast();
            }
            if (result) {
              fromCurated = true;
            }
            break;
        }

        if (result) {
          setEpisode(result);
          setIsCurated(fromCurated);
        } else {
          setError('Ingen episoder funnet');
        }
      } catch {
        setError('Kunne ikke hente tilfeldig episode');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchCuratedEpisode, fetchFromCuratedPodcast, fetchRandomFromApi]
  );

  useEffect(() => {
    fetchRandomEpisode();
  }, [fetchRandomEpisode]);

  const handleShuffle = () => {
    fetchRandomEpisode(true);
  };

  const handlePlay = () => {
    if (!episode) return;

    const playingEpisode: PlayingEpisode = {
      // Episode base properties
      id: episode.id,
      podcastId: episode.podcastId,
      title: episode.title,
      description: episode.description,
      audioUrl: episode.audioUrl,
      duration: episode.duration,
      publishedAt: episode.publishedAt,
      imageUrl: episode.imageUrl || episode.podcast?.imageUrl,
      chaptersUrl: episode.chaptersUrl,
      transcriptUrl: episode.transcriptUrl,
      // PlayingEpisode additions
      podcastTitle: episode.podcast?.title,
      podcastImage: episode.podcast?.imageUrl,
    };

    onPlayEpisode(playingEpisode);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <SpinnerIcon size={32} className={styles.spinning} />
          <span className={styles.loadingText}>Finner noe spennende...</span>
        </div>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className={styles.errorText}>{error || 'Noe gikk galt'}</span>
          <button className={styles.shuffleButton} onClick={handleShuffle} type="button">
            <RefreshIcon size={18} />
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{isCurated ? 'Anbefalt' : 'Tilfeldig'}</h2>
      </div>

      <article className={styles.episodeCard}>
        <div className={styles.episodeHeader}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.episodeImage} loading="lazy" />
          ) : (
            <div className={styles.episodeImagePlaceholder}>
              <PodcastIcon size={32} />
            </div>
          )}
          <div className={styles.episodeInfo}>
            {episode.podcast && <span className={styles.podcastName}>{episode.podcast.title}</span>}
            <h3 className={styles.episodeTitle}>{episode.title}</h3>
            <div className={styles.episodeMeta}>
              <span>{formatDateLong(episode.publishedAt)}</span>
              {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
            </div>
          </div>
        </div>

        {episode.description && (
          <div className={styles.descriptionWrapper}>
            <p className={`${styles.episodeDescription} ${isExpanded ? styles.expanded : ''}`}>
              <FormattedText text={episode.description} />
            </p>
            <button
              className={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
              type="button"
              aria-expanded={isExpanded}
            >
              <ChevronIcon size={16} direction={isExpanded ? 'up' : 'down'} />
              {isExpanded ? 'Vis mindre' : 'Vis mer'}
            </button>
          </div>
        )}

        {episode.podcast && onSelectPodcastById && (
          <button
            className={styles.podcastLink}
            onClick={() => onSelectPodcastById(episode.podcast!.id)}
            type="button"
          >
            Gå til {episode.podcast.title}
          </button>
        )}
      </article>

      <div className={styles.actions}>
        <button className={styles.playButton} onClick={handlePlay} type="button">
          <PlayIcon size={20} />
          Spill av
        </button>
        <button
          className={styles.shuffleButton}
          onClick={handleShuffle}
          disabled={isRefreshing}
          type="button"
        >
          <RefreshIcon size={18} className={isRefreshing ? styles.spinning : undefined} />
          Overrask meg igjen
        </button>
      </div>
    </div>
  );
}
