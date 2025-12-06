/**
 * Podcast Index API Client
 * Documentation: https://podcastindex-org.github.io/docs-api/
 */

const API_BASE = 'https://api.podcastindex.org/api/1.0'
const API_KEY = import.meta.env.VITE_PODCASTINDEX_API_KEY
const API_SECRET = import.meta.env.VITE_PODCASTINDEX_API_SECRET

// Simple cache for API responses
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const apiHeaderTime = Math.floor(Date.now() / 1000)
  const hash = await sha1(API_KEY + API_SECRET + apiHeaderTime)

  return {
    'X-Auth-Date': apiHeaderTime.toString(),
    'X-Auth-Key': API_KEY,
    'Authorization': hash,
    'User-Agent': 'Lyttejeger/1.0'
  }
}

/**
 * Make authenticated request to Podcast Index API
 */
async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryString = new URLSearchParams(params).toString()
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`

  // Check cache
  const cacheKey = url
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }

  const headers = await getAuthHeaders()

  const response = await fetch(url, { headers })

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

/**
 * Search for podcasts by term
 */
export async function searchPodcasts(query: string, max = 20): Promise<SearchResponse> {
  return apiRequest<SearchResponse>('/search/byterm', {
    q: query,
    max: max.toString(),
    clean: 'true'
  })
}

/**
 * Search for podcasts by title
 */
export async function searchByTitle(title: string, max = 20): Promise<SearchResponse> {
  return apiRequest<SearchResponse>('/search/bytitle', {
    q: title,
    max: max.toString(),
    clean: 'true'
  })
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

/**
 * Search for episodes by person/author
 */
export async function searchEpisodesByPerson(name: string, max = 20): Promise<EpisodesResponse> {
  return apiRequest<EpisodesResponse>('/search/byperson', {
    q: name,
    max: max.toString()
  })
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

/**
 * Get categories list
 */
export async function getCategories(): Promise<{ feeds: Array<{ id: number; name: string }> }> {
  return apiRequest('/categories/list')
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
