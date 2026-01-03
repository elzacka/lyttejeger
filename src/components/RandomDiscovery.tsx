import { useState, useEffect, useCallback } from 'react';
import { PodcastIcon, PlayIcon, RefreshIcon, SpinnerIcon } from './icons';
import { getRecentEpisodes } from '../services/podcastIndex';
import { transformEpisode } from '../services/podcastTransform';
import { formatDuration, formatDateLong } from '../utils/search';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlayingEpisode } from './AudioPlayer';
import styles from './RandomDiscovery.module.css';

interface RandomDiscoveryProps {
  onPlayEpisode: (episode: PlayingEpisode) => void;
}

export function RandomDiscovery({ onPlayEpisode }: RandomDiscoveryProps) {
  const [episode, setEpisode] = useState<EpisodeWithPodcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomEpisode = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch recent episodes and pick one randomly
      const response = await getRecentEpisodes({ max: 40 });

      if (response.items && response.items.length > 0) {
        // Pick a random episode from the results
        const randomIndex = Math.floor(Math.random() * response.items.length);
        const apiEpisode = response.items[randomIndex];
        const transformed = transformEpisode(apiEpisode);

        // Create EpisodeWithPodcast with podcast info from the API response
        const episodeWithPodcast: EpisodeWithPodcast = {
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

        setEpisode(episodeWithPodcast);
      } else {
        setError('Ingen episoder funnet');
      }
    } catch {
      setError('Kunne ikke hente tilfeldig episode');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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
        <PodcastIcon size={32} className={styles.icon} />
        <h2 className={styles.title}>Tilfeldig oppdagelse</h2>
        <p className={styles.subtitle}>Kanskje noe for deg?</p>
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

        {episode.description && <p className={styles.episodeDescription}>{episode.description}</p>}
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
