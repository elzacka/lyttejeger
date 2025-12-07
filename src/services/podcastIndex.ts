/**
 * Podcast Index API Client
 * Documentation: https://podcastindex-org.github.io/docs-api/
 * Terms of Service: https://github.com/Podcastindex-org/legal/blob/main/TermsOfService.md
 *
 * Rate Limit: Max 1 request per second for sustained traffic
 * Attribution: Required - see footer component
 */

const API_BASE = 'https://api.podcastindex.org/api/1.0'
const API_KEY = import.meta.env.VITE_PODCASTINDEX_API_KEY
const API_SECRET = import.meta.env.VITE_PODCASTINDEX_API_SECRET

// App identification for User-Agent header
const APP_NAME = 'Lyttejeger'
const APP_VERSION = '1.0.0'
const APP_URL = 'https://github.com/lene/lyttejeger' // Update with actual URL

// Simple cache for API responses (5 min TTL per ToS guidelines)
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limiting: Track last request time to enforce max 1 req/sec
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second in milliseconds

/**
 * Generate SHA-1 hash for API authentication
 */
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate authentication headers for Podcast Index API
 * Per API docs: X-Auth-Key, X-Auth-Date, Authorization (SHA-1 hash), User-Agent
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const apiHeaderTime = Math.floor(Date.now() / 1000)
  const hash = await sha1(API_KEY + API_SECRET + apiHeaderTime)

  return {
    'X-Auth-Date': apiHeaderTime.toString(),
    'X-Auth-Key': API_KEY,
    'Authorization': hash,
    'User-Agent': `${APP_NAME}/${APP_VERSION} (${APP_URL})`
  }
}

/**
 * Wait if needed to respect rate limit (max 1 request per second)
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Make authenticated request to Podcast Index API
 * Includes rate limiting and caching per ToS requirements
 */
async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryString = new URLSearchParams(params).toString()
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`

  // Check cache first (reduces API calls)
  const cacheKey = url
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }

  // Enforce rate limit before making request
  await enforceRateLimit()

  const headers = await getAuthHeaders()

  const response = await fetch(url, { headers })

  // Handle rate limit exceeded (429) - retry after delay
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return apiRequest<T>(endpoint, params)
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Store in cache
  cache.set(cacheKey, { data, timestamp: Date.now() })

  return data as T
}

// API Response Types
export interface PodcastIndexFeed {
  id: number
  podcastGuid: string
  title: string
  url: string
  originalUrl: string
  link: string
  description: string
  author: string
  ownerName: string
  image: string
  artwork: string
  lastUpdateTime: number
  lastCrawlTime: number
  lastParseTime: number
  lastGoodHttpStatusTime: number
  inPollingQueue: number
  priority: number
  itunesId: number | null
  generator: string
  language: string
  explicit: boolean
  type: number
  dead: number
  episodeCount: number
  crawlErrors: number
  parseErrors: number
  categories: Record<string, string>
  locked: number
  imageUrlHash: number
}

export interface PodcastIndexEpisode {
  id: number
  title: string
  link: string
  description: string
  guid: string
  datePublished: number
  datePublishedPretty: string
  dateCrawled: number
  enclosureUrl: string
  enclosureType: string
  enclosureLength: number
  duration: number
  explicit: number
  episode: number | null
  episodeType: string
  season: number
  image: string
  feedItunesId: number | null
  feedImage: string
  feedId: number
  feedLanguage: string
  feedDead: number
  feedDuplicateOf: number | null
  chaptersUrl: string | null
  transcriptUrl: string | null
  soundbite: unknown | null
  soundbites: unknown[]
  persons: unknown[]
  socialInteract: unknown[]
  value: unknown | null
  feedTitle?: string
  feedAuthor?: string
}

export interface SearchResponse {
  status: string
  feeds: PodcastIndexFeed[]
  count: number
  query: string
  description: string
}

export interface EpisodesResponse {
  status: string
  items: PodcastIndexEpisode[]
  count: number
  query: string
  description: string
}

export interface TrendingResponse {
  status: string
  feeds: PodcastIndexFeed[]
  count: number
  max: number
  since: number
  description: string
}

export interface RecentEpisodesResponse {
  status: string
  items: PodcastIndexEpisode[]
  count: number
  max: number
  description: string
}

export interface SearchOptions {
  max?: number
  clean?: boolean
  similar?: boolean
  fulltext?: boolean
  lang?: string
  cat?: string
  notcat?: string
}

/**
 * Search for podcasts by term
 * @param query - Search query
 * @param options - Search options (similar, fulltext, lang, cat, etc.)
 */
export async function searchPodcasts(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const params: Record<string, string> = {
    q: query,
    max: (options.max || 30).toString()
  }

  // Include similar matches for better results
  if (options.similar !== false) {
    params.similar = ''
  }

  // Return full text descriptions
  if (options.fulltext !== false) {
    params.fulltext = ''
  }

  // Filter explicit content
  if (options.clean !== false) {
    params.clean = ''
  }

  // Language filter
  if (options.lang) {
    params.lang = options.lang
  }

  // Category filters
  if (options.cat) {
    params.cat = options.cat
  }
  if (options.notcat) {
    params.notcat = options.notcat
  }

  return apiRequest<SearchResponse>('/search/byterm', params)
}

/**
 * Search for podcasts by title
 */
export async function searchByTitle(title: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const params: Record<string, string> = {
    q: title,
    max: (options.max || 30).toString()
  }

  if (options.similar !== false) params.similar = ''
  if (options.fulltext !== false) params.fulltext = ''
  if (options.clean !== false) params.clean = ''

  return apiRequest<SearchResponse>('/search/bytitle', params)
}

/**
 * Get episodes by feed ID
 */
export async function getEpisodesByFeedId(feedId: number, max = 20): Promise<EpisodesResponse> {
  return apiRequest<EpisodesResponse>('/episodes/byfeedid', {
    id: feedId.toString(),
    max: max.toString()
  })
}

export interface PersonSearchOptions {
  max?: number
  fulltext?: boolean
}

/**
 * Search for episodes by person/author
 * This searches: Person tags, Episode title, Episode description, Feed owner, Feed author
 */
export async function searchEpisodesByPerson(name: string, options: PersonSearchOptions = {}): Promise<EpisodesResponse> {
  const params: Record<string, string> = {
    q: name,
    max: (options.max || 30).toString()
  }

  if (options.fulltext !== false) {
    params.fulltext = ''
  }

  return apiRequest<EpisodesResponse>('/search/byperson', params)
}

export interface EpisodeSearchOptions {
  max?: number
  fulltext?: boolean
}

/**
 * Search for music episodes by term
 * Uses the /search/music/byterm endpoint
 */
export async function searchMusicByTerm(query: string, options: EpisodeSearchOptions = {}): Promise<EpisodesResponse> {
  const params: Record<string, string> = {
    q: query,
    max: (options.max || 30).toString()
  }

  if (options.fulltext !== false) {
    params.fulltext = ''
  }

  return apiRequest<EpisodesResponse>('/search/music/byterm', params)
}

/**
 * Get trending podcasts
 */
export async function getTrendingPodcasts(max = 20, lang?: string, cat?: string): Promise<TrendingResponse> {
  const params: Record<string, string> = { max: max.toString() }
  if (lang) params.lang = lang
  if (cat) params.cat = cat

  return apiRequest<TrendingResponse>('/podcasts/trending', params)
}

/**
 * Get recent episodes
 */
export async function getRecentEpisodes(max = 20, lang?: string): Promise<RecentEpisodesResponse> {
  const params: Record<string, string> = { max: max.toString() }
  if (lang) params.lang = lang

  return apiRequest<RecentEpisodesResponse>('/recent/episodes', params)
}

/**
 * Get podcast by feed ID
 */
export async function getPodcastById(feedId: number): Promise<{ feed: PodcastIndexFeed }> {
  return apiRequest<{ feed: PodcastIndexFeed }>('/podcasts/byfeedid', {
    id: feedId.toString()
  })
}

export interface CategoryItem {
  id: number
  name: string
}

export interface CategoriesResponse {
  status: string
  feeds: CategoryItem[]
  count: number
  description: string
}

/**
 * Get all available categories from Podcast Index
 */
export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>('/categories/list', {})
}

/**
 * Clear API cache
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Check if API credentials are configured
 */
export function isConfigured(): boolean {
  return Boolean(API_KEY && API_SECRET && API_KEY !== 'your_api_key_here')
}
