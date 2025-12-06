import { useState, useMemo, useCallback, useTransition, useEffect } from 'react'
import type { Podcast, Episode, SearchFilters } from '../types/podcast'
import { searchAll, type EpisodeWithPodcast } from '../utils/search'
import {
  searchPodcasts as apiSearchPodcasts,
  getTrendingPodcasts,
  getRecentEpisodes,
  isConfigured
} from '../services/podcastIndex'
import { transformFeeds, transformEpisodes } from '../services/podcastTransform'

const initialFilters: SearchFilters = {
  query: '',
  categories: [],
  languages: [],
  minRating: 0,
  maxDuration: null,
  sortBy: 'relevance',
  explicit: null
}

export interface SearchResultsState {
  podcasts: Podcast[]
  episodes: EpisodeWithPodcast[]
}

interface UseSearchOptions {
  useApi?: boolean
  fallbackPodcasts?: Podcast[]
  fallbackEpisodes?: Episode[]
}

export function useSearch(
  initialPodcasts: Podcast[],
  initialEpisodes: Episode[],
  options: UseSearchOptions = {}
) {
  const { useApi = true, fallbackPodcasts, fallbackEpisodes } = options

  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'podcasts' | 'episodes'>('podcasts')

  // API state
  const [apiPodcasts, setApiPodcasts] = useState<Podcast[]>([])
  const [apiEpisodes, setApiEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Determine which data source to use
  const shouldUseApi = useApi && isConfigured()

  // Fetch trending on mount if API is configured
  useEffect(() => {
    if (shouldUseApi && !hasSearched) {
      loadTrending()
    }
  }, [shouldUseApi])

  // Load trending podcasts
  const loadTrending = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [trendingRes, recentRes] = await Promise.all([
        getTrendingPodcasts(20, 'no,en'),
        getRecentEpisodes(20, 'no')
      ])
      setApiPodcasts(transformFeeds(trendingRes.feeds))
      setApiEpisodes(transformEpisodes(recentRes.items))
    } catch (err) {
      console.error('Failed to load trending:', err)
      setError('Kunne ikke laste populære podcaster')
      // Fall back to mock data
      setApiPodcasts(fallbackPodcasts || initialPodcasts)
      setApiEpisodes(fallbackEpisodes || initialEpisodes)
    } finally {
      setIsLoading(false)
    }
  }

  // Search via API
  const searchViaApi = async (query: string) => {
    if (!query.trim()) {
      loadTrending()
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const searchRes = await apiSearchPodcasts(query, 30)
      const podcasts = transformFeeds(searchRes.feeds)
      setApiPodcasts(podcasts)

      // For episodes, we would need to search each podcast's episodes
      // For now, keep using local search for episodes
      setApiEpisodes([])
    } catch (err) {
      console.error('API search failed:', err)
      setError('Søket feilet. Prøv igjen.')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced API search
  useEffect(() => {
    if (!shouldUseApi) return

    const timer = setTimeout(() => {
      if (filters.query.length >= 2) {
        searchViaApi(filters.query)
      } else if (filters.query.length === 0) {
        loadTrending()
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [filters.query, shouldUseApi])

  // Choose data source
  const podcasts = shouldUseApi ? apiPodcasts : initialPodcasts
  const episodes = shouldUseApi ? apiEpisodes : initialEpisodes

  // Apply local filters and search
  const results = useMemo(() => {
    // If using API, podcasts are already searched, just apply filters
    if (shouldUseApi && filters.query.length >= 2) {
      const filteredPodcasts = applyLocalFilters(podcasts, filters)
      const episodeResults = searchAll([], episodes, filters)
      return {
        podcasts: filteredPodcasts,
        episodes: episodeResults.episodes
      }
    }

    // Otherwise use local search
    return searchAll(podcasts, episodes, filters)
  }, [podcasts, episodes, filters, shouldUseApi])

  const setQuery = useCallback((query: string) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, query }))
    })
  }, [])

  const toggleCategory = useCallback((category: string) => {
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        categories: prev.categories.includes(category)
          ? prev.categories.filter(c => c !== category)
          : [...prev.categories, category]
      }))
    })
  }, [])

  const toggleLanguage = useCallback((language: string) => {
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        languages: prev.languages.includes(language)
          ? prev.languages.filter(l => l !== language)
          : [...prev.languages, language]
      }))
    })
  }, [])

  const setMinRating = useCallback((rating: number) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, minRating: rating }))
    })
  }, [])

  const setSortBy = useCallback((sortBy: SearchFilters['sortBy']) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, sortBy }))
    })
  }, [])

  const setExplicit = useCallback((explicit: boolean | null) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, explicit }))
    })
  }, [])

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setFilters(initialFilters)
    })
    if (shouldUseApi) {
      loadTrending()
    }
  }, [shouldUseApi])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.categories.length > 0) count++
    if (filters.languages.length > 0) count++
    if (filters.minRating > 0) count++
    if (filters.explicit !== null) count++
    return count
  }, [filters])

  return {
    filters,
    results,
    isPending: isPending || isLoading,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    toggleLanguage,
    setMinRating,
    setSortBy,
    setExplicit,
    clearFilters,
    activeFilterCount,
    isApiConfigured: shouldUseApi
  }
}

/**
 * Apply local filters to already-fetched podcasts
 */
function applyLocalFilters(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let filtered = [...podcasts]

  // Filter by categories
  if (filters.categories.length > 0) {
    filtered = filtered.filter(p =>
      p.categories.some(c =>
        filters.categories.some(fc =>
          c.toLowerCase().includes(fc.toLowerCase())
        )
      )
    )
  }

  // Filter by languages
  if (filters.languages.length > 0) {
    filtered = filtered.filter(p =>
      filters.languages.some(l =>
        p.language.toLowerCase().includes(l.toLowerCase())
      )
    )
  }

  // Filter by rating
  if (filters.minRating > 0) {
    filtered = filtered.filter(p => p.rating >= filters.minRating)
  }

  // Filter by explicit
  if (filters.explicit !== null) {
    filtered = filtered.filter(p => p.explicit === filters.explicit)
  }

  // Sort
  switch (filters.sortBy) {
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating)
      break
    case 'newest':
      filtered.sort((a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
      break
    case 'popular':
      filtered.sort((a, b) => b.episodeCount - a.episodeCount)
      break
    // 'relevance' keeps API order
  }

  return filtered
}
