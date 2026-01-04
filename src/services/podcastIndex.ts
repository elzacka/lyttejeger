/**
 * Podcast Index API Client
 * Documentation: https://podcastindex-org.github.io/docs-api/
 * Terms of Service: https://github.com/Podcastindex-org/legal/blob/main/TermsOfService.md
 *
 * Rate Limit: Max 1 request per second for sustained traffic
 * Attribution: Required - see footer component
 */

const API_BASE = 'https://api.podcastindex.org/api/1.0';
const API_KEY = import.meta.env.VITE_PODCASTINDEX_API_KEY;
const API_SECRET = import.meta.env.VITE_PODCASTINDEX_API_SECRET;

const APP_NAME = 'Lyttejeger';
const APP_VERSION = '1.0.0';
const APP_URL = 'https://github.com/lene/lyttejeger';

// Cache for API responses (5 min TTL per ToS)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Rate limiting: max 1 req/sec
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const apiHeaderTime = Math.floor(Date.now() / 1000);
  const hash = await sha1(API_KEY + API_SECRET + apiHeaderTime);

  return {
    'X-Auth-Date': apiHeaderTime.toString(),
    'X-Auth-Key': API_KEY,
    Authorization: hash,
    'User-Agent': `${APP_NAME}/${APP_VERSION} (${APP_URL})`,
  };
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

// Max retries for rate limit handling
const MAX_RETRIES = 3;

async function apiRequest<T>(
  endpoint: string,
  params: Record<string, string> = {},
  retryCount = 0
): Promise<T> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  await enforceRateLimit();

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  // Handle rate limit exceeded (429) - retry with bounded attempts
  if (response.status === 429) {
    if (retryCount >= MAX_RETRIES) {
      throw new Error('API rate limit exceeded - max retries reached');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return apiRequest<T>(endpoint, params, retryCount + 1);
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data as T;
}

// API Response Types
export interface PodcastIndexFeed {
  id: number;
  podcastGuid: string;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  lastCrawlTime: number;
  lastParseTime: number;
  lastGoodHttpStatusTime: number;
  inPollingQueue: number;
  priority: number;
  itunesId: number | null;
  generator: string;
  language: string;
  explicit: boolean;
  type: number;
  dead: number;
  episodeCount: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Record<string, string>;
  locked: number;
  imageUrlHash: number;
}

/**
 * Soundbite from Podcasting 2.0 spec
 * @see https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#soundbite
 */
export interface PodcastIndexSoundbite {
  startTime: number;
  duration: number;
  title: string;
}

export interface PodcastIndexEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  guid: string;
  datePublished: number;
  datePublishedPretty: string;
  dateCrawled: number;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  explicit: number;
  episode: number | null;
  episodeType: string;
  season: number;
  image: string;
  feedItunesId: number | null;
  feedImage: string;
  feedId: number;
  feedLanguage: string;
  feedDead: number;
  feedDuplicateOf: number | null;
  chaptersUrl: string | null;
  transcriptUrl: string | null;
  soundbite: PodcastIndexSoundbite | null;
  soundbites: PodcastIndexSoundbite[];
  persons: unknown[];
  socialInteract: unknown[];
  value: unknown | null;
  feedTitle?: string;
  feedAuthor?: string;
}

export interface SearchResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  query: string;
  description: string;
}

export interface EpisodesResponse {
  status: string;
  items: PodcastIndexEpisode[];
  count: number;
  query: string;
  description: string;
}

export interface SearchOptions {
  max?: number;
  clean?: boolean;
  similar?: boolean;
  fulltext?: boolean;
  lang?: string;
  cat?: string;
  notcat?: string;
  val?: 'any' | 'lightning' | 'hive' | 'webmonetization'; // Value4Value filter
  aponly?: boolean; // Only podcasts with iTunes ID (false = indie podcasts)
}

/**
 * Search podcasts by title (exact match preferred)
 * More precise than byterm - requires query to appear in title
 */
export async function searchPodcastsByTitle(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const params: Record<string, string> = {
    q: query,
    max: (options.max || 30).toString(),
  };

  if (options.similar !== false) params.similar = '';
  if (options.fulltext !== false) params.fulltext = '';
  if (options.clean) params.clean = '';
  if (options.lang) params.lang = options.lang;
  if (options.val) params.val = options.val;

  return apiRequest<SearchResponse>('/search/bytitle', params);
}

/**
 * Search podcasts by term (fuzzy search across title, author, description)
 */
export async function searchPodcasts(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const params: Record<string, string> = {
    q: query,
    max: (options.max || 30).toString(),
  };

  if (options.similar) params.similar = '';
  if (options.fulltext !== false) params.fulltext = '';
  if (options.clean) params.clean = '';
  if (options.lang) params.lang = options.lang;
  if (options.cat) params.cat = options.cat;
  if (options.notcat) params.notcat = options.notcat;
  if (options.val) params.val = options.val;
  if (options.aponly === false) {
    // No direct param - handled by excluding results with itunesId
  }

  return apiRequest<SearchResponse>('/search/byterm', params);
}

export interface EpisodesByFeedIdOptions {
  max?: number;
  since?: number; // Unix timestamp - only return episodes published since this time
}

export async function getEpisodesByFeedId(
  feedId: number,
  options: EpisodesByFeedIdOptions = {}
): Promise<EpisodesResponse> {
  const params: Record<string, string> = {
    id: feedId.toString(),
    max: (options.max || 20).toString(),
    fulltext: '', // Request full descriptions instead of truncated
  };

  if (options.since) {
    params.since = options.since.toString();
  }

  return apiRequest<EpisodesResponse>('/episodes/byfeedid', params);
}

export interface EpisodesByFeedIdsOptions {
  max?: number;
  since?: number; // Unix timestamp - only return episodes published since this time
}

/**
 * Fetch episodes from multiple feed IDs in a single request
 * API supports up to 200 comma-separated feed IDs
 */
export async function getEpisodesByFeedIds(
  feedIds: number[],
  options: EpisodesByFeedIdsOptions = {}
): Promise<EpisodesResponse> {
  if (feedIds.length === 0) {
    return { status: 'true', items: [], count: 0, query: '', description: '' };
  }

  // API limit: max 200 feed IDs per request
  const limitedIds = feedIds.slice(0, 200);

  const params: Record<string, string> = {
    id: limitedIds.join(','),
    max: (options.max || 100).toString(),
    fulltext: '',
  };

  if (options.since) {
    params.since = options.since.toString();
  }

  return apiRequest<EpisodesResponse>('/episodes/byfeedid', params);
}

export interface PodcastByIdResponse {
  status: string;
  feed: PodcastIndexFeed;
  query: {
    id: string;
  };
  description: string;
}

export async function getPodcastByFeedId(feedId: number): Promise<PodcastByIdResponse> {
  return apiRequest<PodcastByIdResponse>('/podcasts/byfeedid', {
    id: feedId.toString(),
  });
}

export interface PersonSearchOptions {
  max?: number;
  fulltext?: boolean;
}

export async function searchEpisodesByPerson(
  name: string,
  options: PersonSearchOptions = {}
): Promise<EpisodesResponse> {
  const params: Record<string, string> = {
    q: name,
    max: (options.max || 30).toString(),
  };

  if (options.fulltext !== false) params.fulltext = '';

  return apiRequest<EpisodesResponse>('/search/byperson', params);
}

export interface CategoryItem {
  id: number;
  name: string;
}

export interface CategoriesResponse {
  status: string;
  feeds: CategoryItem[];
  count: number;
  description: string;
}

export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>('/categories/list', {});
}

export function isConfigured(): boolean {
  return Boolean(API_KEY && API_SECRET && API_KEY !== 'your_api_key_here');
}

// Trending/Browse endpoints for filter-only browsing

export interface TrendingOptions {
  max?: number;
  since?: number; // Unix timestamp - return items since this time
  lang?: string; // Language code (e.g., 'no', 'en')
  cat?: string; // Category ID
  notcat?: string; // Exclude category ID
  val?: 'any' | 'lightning' | 'hive' | 'webmonetization'; // Value4Value filter
  aponly?: boolean; // Only podcasts with iTunes ID (false = indie podcasts)
}

export async function getTrendingPodcasts(options: TrendingOptions = {}): Promise<SearchResponse> {
  const params: Record<string, string> = {
    max: (options.max || 50).toString(),
  };

  if (options.since) params.since = options.since.toString();
  if (options.lang) params.lang = options.lang;
  if (options.cat) params.cat = options.cat;
  if (options.notcat) params.notcat = options.notcat;
  if (options.val) params.val = options.val;
  // aponly is handled client-side by filtering results

  return apiRequest<SearchResponse>('/podcasts/trending', params);
}

export interface RecentEpisodesOptions {
  max?: number;
  excludeString?: string; // Exclude episodes with this string in title
  before?: number; // Only return episodes before this episode ID
  fulltext?: boolean;
  lang?: string; // Language code filter (e.g., 'no', 'en', 'da')
}

export async function getRecentEpisodes(
  options: RecentEpisodesOptions = {}
): Promise<EpisodesResponse> {
  const params: Record<string, string> = {
    max: (options.max || 50).toString(),
  };

  if (options.excludeString) params.excludeString = options.excludeString;
  if (options.before) params.before = options.before.toString();
  if (options.fulltext !== false) params.fulltext = '';
  if (options.lang) params.lang = options.lang;

  return apiRequest<EpisodesResponse>('/recent/episodes', params);
}

// Soundbite API types and functions

export interface SoundbiteItem {
  enclosureUrl: string;
  title: string;
  startTime: number;
  duration: number;
  episodeId: number;
  episodeTitle: string;
  feedTitle: string;
  feedUrl: string;
  feedId: number;
  feedImage: string;
}

export interface SoundbitesResponse {
  status: string;
  items: SoundbiteItem[];
  count: number;
  description: string;
}

export interface RecentSoundbitesOptions {
  max?: number;
}

/**
 * Get recent soundbites from across the podcast index
 * Great for discovery - shows highlighted clips from various podcasts
 */
export async function getRecentSoundbites(
  options: RecentSoundbitesOptions = {}
): Promise<SoundbitesResponse> {
  const params: Record<string, string> = {
    max: (options.max || 20).toString(),
  };

  return apiRequest<SoundbitesResponse>('/recent/soundbites', params);
}

// Live Episodes API types and functions

export interface LiveEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  guid: string;
  datePublished: number;
  datePublishedPretty: string;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  explicit: number;
  image: string;
  feedId: number;
  feedTitle: string;
  feedImage: string;
  feedLanguage: string;
  categories: Record<string, string>;
  /** Live status: 0 = not live, 1 = live */
  status: 'live' | 'pending' | 'ended';
  /** Start time of live episode (unix timestamp) */
  start: number;
  /** End time of live episode (unix timestamp) */
  end: number;
}

export interface LiveEpisodesResponse {
  status: string;
  items: LiveEpisode[];
  count: number;
  description: string;
}

export interface LiveEpisodesOptions {
  max?: number;
}

/**
 * Get currently live or upcoming live episodes
 * Returns episodes that are currently streaming or scheduled to go live soon
 */
export async function getLiveEpisodes(
  options: LiveEpisodesOptions = {}
): Promise<LiveEpisodesResponse> {
  const params: Record<string, string> = {
    max: (options.max || 20).toString(),
  };

  return apiRequest<LiveEpisodesResponse>('/episodes/live', params);
}
