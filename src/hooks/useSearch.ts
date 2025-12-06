import { useState, useMemo, useCallback, useTransition } from 'react'
import type { Podcast, Episode, SearchFilters } from '../types/podcast'
import { searchAll, type EpisodeWithPodcast } from '../utils/search'

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

export function useSearch(podcasts: Podcast[], episodes: Episode[]) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'podcasts' | 'episodes'>('podcasts')

  const results = useMemo(() => {
    return searchAll(podcasts, episodes, filters)
  }, [podcasts, episodes, filters])

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
  }, [])

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
    isPending,
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    toggleLanguage,
    setMinRating,
    setSortBy,
    setExplicit,
    clearFilters,
    activeFilterCount
  }
}
