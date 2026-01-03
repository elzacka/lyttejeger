import { useState, useEffect, useCallback } from 'react';
import { getLiveEpisodes, type LiveEpisode } from '../services/podcastIndex';
import { FEATURES } from '../config/features';

interface UseLiveEpisodesReturn {
  liveEpisodes: LiveEpisode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  isLive: (feedId: string) => boolean;
}

// Poll interval for live episodes (5 minutes)
const POLL_INTERVAL = 5 * 60 * 1000;

/**
 * Hook for fetching and tracking live podcast episodes
 * Polls the API periodically to keep live status up to date
 */
export function useLiveEpisodes(): UseLiveEpisodesReturn {
  const [liveEpisodes, setLiveEpisodes] = useState<LiveEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    if (!FEATURES.LIVE_EPISODES) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getLiveEpisodes({ max: 50 });
      // Filter to only currently live episodes (not pending or ended)
      const currentlyLive = response.items.filter((ep) => ep.status === 'live');
      setLiveEpisodes(currentlyLive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente live-episoder');
      setLiveEpisodes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!FEATURES.LIVE_EPISODES) return;

    fetchLive();
  }, [fetchLive]);

  // Poll for updates
  useEffect(() => {
    if (!FEATURES.LIVE_EPISODES) return;

    const interval = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Check if a specific feed has a live episode
  const isLive = useCallback(
    (feedId: string): boolean => {
      return liveEpisodes.some((ep) => ep.feedId.toString() === feedId);
    },
    [liveEpisodes]
  );

  return {
    liveEpisodes,
    isLoading,
    error,
    refresh: fetchLive,
    isLive,
  };
}
