export interface Podcast {
  id: string
  title: string
  author: string
  description: string
  imageUrl: string
  feedUrl: string
  categories: string[]
  language: string
  episodeCount: number
  lastUpdated: string
  rating: number
  explicit: boolean
}

export interface Episode {
  id: string
  podcastId: string
  title: string
  description: string
  audioUrl: string
  duration: number
  publishedAt: string
  imageUrl?: string
}

export interface SearchFilters {
  query: string
  categories: string[]
  languages: string[]
  minRating: number
  maxDuration: number | null
  sortBy: 'relevance' | 'rating' | 'newest' | 'popular'
  explicit: boolean | null
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}
