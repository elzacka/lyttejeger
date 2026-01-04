/**
 * Curated podcast and episode recommendations
 *
 * Add podcasts by feedId (from Podcast Index) or episodes by episode guid.
 * The discovery mode will shuffle through these when available.
 *
 * To find feedId: Search on podcastindex.org or use the app's search
 * To find episode guid: Check the podcast RSS feed or episode API response
 */

export interface CuratedPodcast {
  feedId: number;
  /** Optional comment for your own reference */
  note?: string;
}

export interface CuratedEpisode {
  feedId: number;
  /** Episode guid from RSS feed */
  guid: string;
  /** Optional comment for your own reference */
  note?: string;
}

/**
 * Curated podcasts - discovery will fetch a random recent episode from these
 */
export const CURATED_PODCASTS: CuratedPodcast[] = [
  { feedId: 6884446 },
  { feedId: 6927194 },
  { feedId: 7131243 },
  { feedId: 735150 },
  { feedId: 6096232 },
  { feedId: 7160479 },
  { feedId: 7076134 },
  { feedId: 942171 },
  { feedId: 7083155 },
  { feedId: 6797007 },
  { feedId: 6875318 },
];

/**
 * Curated episodes - discovery will randomly pick from these specific episodes
 * Good for highlighting particularly great episodes
 */
export const CURATED_EPISODES: CuratedEpisode[] = [
  // Add specific episodes here:
  // { feedId: 123456, guid: 'episode-guid-here', note: 'Great interview with...' },
];

/**
 * Whether to use curated content in discovery mode
 * Set to false to use only the random API-based discovery
 */
export const USE_CURATED_DISCOVERY = true;

/**
 * Probability (0-1) of showing curated content vs random API content
 * 0.7 = 70% chance of curated, 30% chance of random
 */
export const CURATED_PROBABILITY = 0.7;
