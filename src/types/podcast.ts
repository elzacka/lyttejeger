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
  transcriptUrl?: string
  chaptersUrl?: string
}

export interface SearchFilters {
  query: string
  categories: string[]
  languages: string[]
  maxDuration: number | null
  sortBy: 'relevance' | 'newest' | 'oldest' | 'popular'
  explicit: boolean | null
  dateFrom: number | null  // Year (e.g., 2020)
  dateTo: number | null    // Year (e.g., 2024)
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}
