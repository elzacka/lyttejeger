/**
 * Listen Notes API Client
 * Documentation: https://www.listennotes.com/api/docs/
 *
 * Free tier: 300 requests/month, 2 req/sec, 30 results per query
 * Used as secondary source for full-text episode and podcast search
 *
 * Listen Notes excels at:
 * - Full-text search across episode titles, descriptions, and transcripts
 * - Finding episodes by topic/keyword (not just podcast names)
 * - Better relevance ranking for content-based searches
 */

// Use test API if no key configured (returns mock but realistic data)
const API_KEY = import.meta.env.VITE_LISTENNOTES_API_KEY
const API_BASE = API_KEY
  ? 'https://listen-api.listennotes.com/api/v2'
  : 'https://listen-api-test.listennotes.com/api/v2'

// Allowed languages for filtering (Norwegian, Danish, Swedish, English)
const ALLOWED_LANGUAGES = ['Norwegian', 'Danish', 'Swedish', 'English']

// Rate limiting: max 2 req/sec for free tier
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500

// Track API usage for monitoring
let requestCount = 0
const REQUEST_COUNT_RESET_INTERVAL = 60 * 60 * 1000 // 1 hour
let lastResetTime = Date.now()

function trackRequest(): void {
  const now = Date.now()
  if (now - lastResetTime > REQUEST_COUNT_RESET_INTERVAL) {
    requestCount = 0
    lastResetTime = now
  }
  requestCount++
}

export function getRequestCount(): number {
  return requestCount
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryString = new URLSearchParams(params).toString()
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`

  await enforceRateLimit()
  trackRequest()

  const headers: HeadersInit = {
    'Accept': 'application/json'
  }

  // Only add API key header for production API
  if (API_KEY) {
    headers['X-ListenAPI-Key'] = API_KEY
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    // Handle rate limiting gracefully
    if (response.status === 429) {
      throw new Error('Listen Notes rate limit reached. Please try again in a moment.')
    }
    throw new Error(`Listen Notes API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

// API Response Types
export interface ListenNotesEpisode {
  id: string
  title_original: string
  title_highlighted: string
  description_original: string
  description_highlighted: string
  pub_date_ms: number
  audio: string
  audio_length_sec: number
  image: string
  thumbnail: string
  explicit_content: boolean
  listennotes_url: string
  podcast: {
    id: string
    title_original: string
    title_highlighted: string
    publisher_original: string
    image: string
    thumbnail: string
    listennotes_url: string
  }
}

export interface ListenNotesPodcast {
  id: string
  title_original: string
  title_highlighted: string
  description_original: string
  description_highlighted: string
  publisher_original: string
  image: string
  thumbnail: string
  listennotes_url: string
  total_episodes: number
  explicit_content: boolean
  latest_pub_date_ms: number
  language: string
  rss?: string
  genre_ids?: number[]
}

export interface SearchResponse {
  took: number
  count: number
  total: number
  results: ListenNotesEpisode[] | ListenNotesPodcast[]
  next_offset: number
}

export interface EpisodeSearchResponse extends SearchResponse {
  results: ListenNotesEpisode[]
}

export interface PodcastSearchResponse extends SearchResponse {
  results: ListenNotesPodcast[]
}

export interface SearchOptions {
  offset?: number
  language?: string
  sort_by_date?: 0 | 1
  len_min?: number
  len_max?: number
}

/**
 * Search episodes by query (full-text search)
 */
export async function searchEpisodes(query: string, options: SearchOptions = {}): Promise<EpisodeSearchResponse> {
  const params: Record<string, string> = {
    q: query,
    type: 'episode',
    language: ALLOWED_LANGUAGES.join(',')
  }

  if (options.offset) params.offset = options.offset.toString()
  if (options.sort_by_date !== undefined) params.sort_by_date = options.sort_by_date.toString()
  if (options.len_min) params.len_min = options.len_min.toString()
  if (options.len_max) params.len_max = options.len_max.toString()

  return apiRequest<EpisodeSearchResponse>('/search', params)
}

/**
 * Search podcasts by query
 */
export async function searchPodcasts(query: string, options: SearchOptions = {}): Promise<PodcastSearchResponse> {
  const params: Record<string, string> = {
    q: query,
    type: 'podcast',
    language: ALLOWED_LANGUAGES.join(',')
  }

  if (options.offset) params.offset = options.offset.toString()
  if (options.sort_by_date !== undefined) params.sort_by_date = options.sort_by_date.toString()

  return apiRequest<PodcastSearchResponse>('/search', params)
}

/**
 * Check if Listen Notes API is configured (has real API key)
 */
export function isConfigured(): boolean {
  return Boolean(API_KEY)
}

/**
 * Check if Listen Notes is available for real searches
 * Note: Test API returns mock data (same results for any query), so we only
 * enable Listen Notes when a real API key is configured
 */
export function isAvailable(): boolean {
  return Boolean(API_KEY) // Only available with real API key
}
