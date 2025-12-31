export interface Podcast {
  id: string
  title: string
  author: string
  description: string
  imageUrl: string
  feedUrl: string
  websiteUrl?: string
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

export interface DateFilter {
  day: number
  month: number  // 1-12
  year: number
}

export interface SearchFilters {
  query: string
  categories: string[]
  excludeCategories: string[]
  languages: string[]
  maxDuration: number | null
  sortBy: 'relevance' | 'newest' | 'oldest' | 'popular'
  explicit: boolean | null
  dateFrom: DateFilter | null
  dateTo: DateFilter | null
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}
