import { useState, useEffect, useRef } from 'react';
import { Podcast as PodcastIcon, Play as PlayIcon, RefreshCw as RefreshIcon, Loader2 as SpinnerIcon, MoreVertical as MoreVerticalIcon } from 'lucide-react';
import {
  getRecentEpisodes,
  getEpisodesByFeedId,
  getPodcastByFeedId,
  getEpisodeById,
} from '../services/podcastIndex';
import { transformEpisode } from '../services/podcastTransform';
import { formatDuration } from '../utils/search';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlayingEpisode } from './AudioPlayer';
import { CURATED_PODCASTS, CURATED_EPISODES, DISCOVERY_MODE } from '../data/curatedContent';
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
  onAddToQueue: (episode: EpisodeWithPodcast) => void;
  onPlayNext: (episode: EpisodeWithPodcast) => void;
  isInQueue: (episodeId: string) => boolean;
}

export function RandomDiscovery({ onPlayEpisode, onSelectPodcastById, onAddToQueue, onPlayNext, isInQueue }: RandomDiscoveryProps) {
  const [episodes, setEpisodes] = useState<EpisodeWithPodcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurated, setIsCurated] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch the first (oldest) episode from a curated podcast
  // Many curated podcasts are series, so we always show the first episode
  const fetchFromCuratedPodcast = async (): Promise<EpisodeWithPodcast | null> => {
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
    } catch (error) {
      console.error('fetchFromCuratedPodcast error:', error);
      return null;
    }
  };

  // Fetch a specific curated episode by Podcast Index episode ID
  const fetchCuratedEpisode = async (): Promise<EpisodeWithPodcast | null> => {
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
    } catch (error) {
      console.error('fetchCuratedEpisode error:', error);
      return null;
    }
  };

  // Fetch random episode from API (original behavior)
  const fetchRandomFromApi = async (): Promise<EpisodeWithPodcast | null> => {
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
  };

  const fetchRandomEpisodes = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const results: EpisodeWithPodcast[] = [];
      const seenIds = new Set<string>();
      let fromCurated = false;
      let attempts = 0;
      const maxAttempts = 20; // Prevent infinite loops

      // Fetch 8 unique episodes
      while (results.length < 8 && attempts < maxAttempts) {
        attempts++;
        let result: EpisodeWithPodcast | null = null;

        // Velg kilde basert på DISCOVERY_MODE
        switch (DISCOVERY_MODE) {
          case 'random':
            result = await fetchRandomFromApi();
            break;

          case 'podcasts':
            if (CURATED_PODCASTS.length > 0) {
              result = await fetchFromCuratedPodcast();
              fromCurated = true;
            }
            break;

          case 'episodes':
            if (CURATED_EPISODES.length > 0) {
              result = await fetchCuratedEpisode();
              fromCurated = true;
            }
            break;

          case 'podcasts-episodes':
            if (CURATED_EPISODES.length > 0 && CURATED_PODCASTS.length > 0) {
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

        // Only add if unique
        if (result && !seenIds.has(result.id)) {
          seenIds.add(result.id);
          results.push(result);
        }
      }

      if (results.length > 0) {
        setEpisodes(results);
        setIsCurated(fromCurated);
      } else {
        setError('Ingen episoder funnet');
      }
    } catch (error) {
      console.error('RandomDiscovery fetch error:', error);
      setError('Kunne ikke hente episoder');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRandomEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShuffle = () => {
    fetchRandomEpisodes(true);
  };

  const handlePlay = (episode: EpisodeWithPodcast) => {
    const playingEpisode: PlayingEpisode = {
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
      podcastTitle: episode.podcast?.title,
      podcastImage: episode.podcast?.imageUrl,
    };

    onPlayEpisode(playingEpisode);
  };

  const handleToggleMenu = (episodeId: string) => {
    setOpenMenuId(prev => prev === episodeId ? null : episodeId);
  };

  const handleNavigateToPodcast = (podcastId: string) => {
    if (onSelectPodcastById) {
      onSelectPodcastById(podcastId);
    }
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuContainer = menuRefs.current.get(openMenuId);
        if (menuContainer && !menuContainer.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Failsafe: Ensure scroll is never locked when component unmounts
  useEffect(() => {
    return () => {
      document.body.classList.remove('scroll-lock');
    };
  }, []);

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

  if (error || episodes.length === 0) {
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{isCurated ? 'Anbefalt' : 'Oppdagelser'}</h2>
        <button
          className={styles.shuffleButton}
          onClick={handleShuffle}
          disabled={isRefreshing}
          type="button"
          aria-label="Shuffle episoder"
        >
          <RefreshIcon size={18} className={isRefreshing ? styles.spinning : undefined} />
        </button>
      </div>

      <div className={styles.grid}>
        {episodes.map((episode) => {
          const imageUrl = episode.imageUrl || episode.podcast?.imageUrl;
          const inQueue = isInQueue(episode.id);
          const menuOpen = openMenuId === episode.id;

          return (
            <article key={episode.id} className={styles.card}>
              <button
                className={styles.cardImage}
                onClick={() => handlePlay(episode)}
                aria-label={`Spill ${episode.title}`}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" loading="lazy" />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <PodcastIcon size={32} />
                  </div>
                )}
                <div className={styles.playOverlay}>
                  <PlayIcon size={24} />
                </div>
              </button>

              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  {episode.podcast && (
                    <button
                      className={styles.podcastName}
                      onClick={() => handleNavigateToPodcast(episode.podcastId)}
                      aria-label={`Gå til ${episode.podcast.title}`}
                    >
                      {episode.podcast.title}
                    </button>
                  )}
                  <div
                    className={styles.menuContainer}
                    ref={(el) => {
                      if (el) {
                        menuRefs.current.set(episode.id, el);
                      } else {
                        menuRefs.current.delete(episode.id);
                      }
                    }}
                  >
                    <button
                      className={styles.menuButton}
                      onClick={() => handleToggleMenu(episode.id)}
                      aria-label="Flere valg"
                      aria-expanded={menuOpen}
                    >
                      <MoreVerticalIcon size={16} />
                    </button>
                    {menuOpen && (
                      <div className={styles.menu}>
                        <button onClick={() => { onPlayNext(episode); setOpenMenuId(null); }}>
                          Spill neste
                        </button>
                        <button onClick={() => { onAddToQueue(episode); setOpenMenuId(null); }}>
                          {inQueue ? 'I kø' : 'Legg til i kø'}
                        </button>
                        {episode.podcast && (
                          <button onClick={() => handleNavigateToPodcast(episode.podcastId)}>
                            Gå til podcast
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <h3 className={styles.episodeTitle}>{episode.title}</h3>
                {formatDuration(episode.duration) && (
                  <span className={styles.duration}>{formatDuration(episode.duration)}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
