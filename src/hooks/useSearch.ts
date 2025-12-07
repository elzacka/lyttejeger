import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react'
import type { Podcast, Episode, SearchFilters } from '../types/podcast'
import { searchAll, type EpisodeWithPodcast } from '../utils/search'
import {
  searchPodcasts as apiSearchPodcasts,
  searchEpisodesByPerson,
  getEpisodesByFeedId,
  isConfigured,
  type SearchOptions
} from '../services/podcastIndex'
import { transformFeeds, transformEpisodes } from '../services/podcastTransform'
import { parseSearchQuery } from '../utils/search'

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
}

export function useSearch(
  initialPodcasts: Podcast[],
  initialEpisodes: Episode[],
  options: UseSearchOptions = {}
) {
  const { useApi = true } = options

  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'podcasts' | 'episodes'>('podcasts')

  // API state
  const [apiPodcasts, setApiPodcasts] = useState<Podcast[]>([])
  const [apiEpisodes, setApiEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine which data source to use
  const shouldUseApi = useApi && isConfigured()

  // Track current search to prevent race conditions
  const currentSearchRef = useRef<string>('')

  // Store last successful search results for incremental filtering
  const lastSearchQueryRef = useRef<string>('')
  const lastSearchResultsRef = useRef<Podcast[]>([])

  // Clear results when query is empty
  const clearResults = useCallback(() => {
    setApiPodcasts([])
    setApiEpisodes([])
    lastSearchQueryRef.current = ''
    lastSearchResultsRef.current = []
  }, [])

  // Allowed language codes (Norwegian, Danish, Swedish, English)
  const ALLOWED_LANGUAGES = ['no', 'nb', 'nn', 'da', 'sv', 'en']

  // Search via API with enhanced options
  const searchViaApi = async (query: string, searchType: 'podcasts' | 'episodes') => {
    if (!query.trim()) {
      clearResults()
      return
    }

    // Track this search to prevent race conditions
    currentSearchRef.current = query

    setIsLoading(true)
    setError(null)

    try {
      // Build search options based on current filters
      const searchOptions: SearchOptions = {
        max: 100,         // Fetch more to compensate for local filtering
        similar: true,    // Include similar matches for better results
        fulltext: true,   // Get full descriptions
        clean: filters.explicit === false ? true : undefined  // Only filter explicit if user chose "family-friendly"
      }

      // Add category filter if selected
      if (filters.categories.length > 0) {
        searchOptions.cat = filters.categories.join(',')
      }

      const searchRes = await apiSearchPodcasts(query, searchOptions)

      // Only update if this is still the current search
      if (currentSearchRef.current !== query) {
        return
      }

      // Transform and filter by allowed languages locally
      // (API language filter doesn't work reliably)
      let podcasts = transformFeeds(searchRes.feeds)
      podcasts = podcasts.filter(p => {
        if (!p.language) return true // Keep if no language specified
        const langCode = p.language.toLowerCase().slice(0, 2)
        return ALLOWED_LANGUAGES.includes(langCode)
      })

      // Store for incremental filtering
      lastSearchQueryRef.current = query
      lastSearchResultsRef.current = podcasts

      setApiPodcasts(podcasts)

      // For episode search, use byperson API which searches episode content
      if (searchType === 'episodes') {
        try {
          // Use search/byperson which searches: Person tags, Episode title,
          // Episode description, Feed owner, Feed author
          const episodesRes = await searchEpisodesByPerson(query, { max: 50, fulltext: true })

          // Only update if this is still the current search
          if (currentSearchRef.current !== query) {
            return
          }

          let episodes = transformEpisodes(episodesRes.items || [])

          // Add podcast info from the API response
          episodes = episodes.map((ep, idx) => {
            const apiEp = episodesRes.items?.[idx]
            return {
              ...ep,
              podcastTitle: apiEp?.feedTitle || '',
              podcastAuthor: apiEp?.feedAuthor || '',
              podcastImage: apiEp?.feedImage || ''
            }
          })

          // Apply language filter locally if set (API doesn't support it for byperson)
          if (filters.languages.length > 0) {
            episodes = episodes.filter(ep => {
              const apiEp = episodesRes.items?.find(item => item.id.toString() === ep.id)
              if (!apiEp?.feedLanguage) return true
              return filters.languages.some(lang =>
                apiEp.feedLanguage.toLowerCase().includes(lang.toLowerCase().slice(0, 2))
              )
            })
          }

          // Apply local text filtering for advanced query syntax (OR, exact phrases, exclusions)
          const parsed = parseSearchQuery(query)
          if (parsed.exactPhrases.length > 0 || parsed.mustExclude.length > 0 || parsed.shouldInclude.length > 0) {
            episodes = episodes.filter(ep => {
              const fullText = `${ep.title} ${ep.description}`.toLowerCase()

              // Must contain exact phrases
              for (const phrase of parsed.exactPhrases) {
                if (!fullText.includes(phrase)) return false
              }

              // Must not contain excluded terms
              for (const term of parsed.mustExclude) {
                if (fullText.includes(term)) return false
              }

              return true
            })
          }

          setApiEpisodes(episodes)
        } catch (err) {
          console.error('Episode search failed:', err)
          // Fallback: fetch from matching podcasts
          if (podcasts.length > 0) {
            const topPodcasts = podcasts.slice(0, 5)
            const episodePromises = topPodcasts.map(async (podcast) => {
              try {
                const episodesRes = await getEpisodesByFeedId(parseInt(podcast.id), 10)
                const episodes = transformEpisodes(episodesRes.items || [])
                return episodes.map(ep => ({
                  ...ep,
                  podcastTitle: podcast.title,
                  podcastAuthor: podcast.author,
                  podcastImage: podcast.imageUrl
                }))
              } catch {
                return []
              }
            })
            const episodeResults = await Promise.all(episodePromises)
            setApiEpisodes(episodeResults.flat())
          } else {
            setApiEpisodes([])
          }
        }
      } else {
        setApiEpisodes([])
      }
    } catch (err) {
      // Only show error if this is still the current search
      if (currentSearchRef.current === query) {
        console.error('API search failed:', err)
        setError('Søket feilet. Prøv igjen.')
      }
    } finally {
      // Only stop loading if this is still the current search
      if (currentSearchRef.current === query) {
        setIsLoading(false)
      }
    }
  }

  // Extract complete words from query (words followed by space or at end after space)
  // "hele hi" -> "hele" (only complete words for API)
  // "hele historien" -> "hele historien" (both complete)
  const getCompleteWords = (query: string): string => {
    const trimmed = query.trim()
    if (!trimmed) return ''

    // If query ends with space, all words are complete
    if (query.endsWith(' ')) {
      return trimmed
    }

    // Otherwise, only words before the last space are complete
    const lastSpaceIndex = trimmed.lastIndexOf(' ')
    if (lastSpaceIndex === -1) {
      // Single word being typed - use it for API (user might be done)
      return trimmed
    }

    // Return only complete words (everything before and including last complete word)
    return trimmed.substring(0, lastSpaceIndex).trim()
  }

  // Check if we should call API or filter locally
  const shouldCallApi = useCallback((newQuery: string): boolean => {
    const completeWords = getCompleteWords(newQuery)
    const lastCompleteWords = getCompleteWords(lastSearchQueryRef.current)

    // If no complete words yet, don't call API
    if (!completeWords) return false

    // If complete words changed, call API
    if (completeWords !== lastCompleteWords) return true

    // If we have no cached results, call API
    if (lastSearchResultsRef.current.length === 0) return true

    return false
  }, [])

  // Track filters for re-triggering API search
  const filtersRef = useRef({ languages: filters.languages, categories: filters.categories })

  // Debounced API search
  useEffect(() => {
    if (!shouldUseApi) return

    const query = filters.query

    // If query is empty, clear results
    if (query.length === 0) {
      clearResults()
      return
    }

    // If query is too short, do nothing
    if (query.length < 2) return

    // Only call API when complete words change
    if (shouldCallApi(query)) {
      // Use complete words for API search
      const completeWords = getCompleteWords(query)
      if (completeWords.length >= 2) {
        const timer = setTimeout(() => {
          searchViaApi(completeWords, activeTab)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
    // Local filtering happens in useMemo below
  }, [filters.query, shouldUseApi, shouldCallApi, clearResults, activeTab])

  // Re-search when tab changes (if we have a query)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return

    // Trigger new search with current query for the new tab
    searchViaApi(filters.query, activeTab)
  }, [activeTab])

  // Re-search when language or category filters change (API supports these)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return

    const filtersChanged =
      JSON.stringify(filtersRef.current.languages) !== JSON.stringify(filters.languages) ||
      JSON.stringify(filtersRef.current.categories) !== JSON.stringify(filters.categories)

    if (filtersChanged) {
      filtersRef.current = { languages: filters.languages, categories: filters.categories }
      // Re-trigger API search with updated filters
      const timer = setTimeout(() => {
        searchViaApi(filters.query, activeTab)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [filters.languages, filters.categories, filters.query, activeTab, shouldUseApi])

  // Choose data source
  const podcasts = shouldUseApi ? apiPodcasts : initialPodcasts
  const episodes = shouldUseApi ? apiEpisodes : initialEpisodes

  // Apply local filters and search
  const results = useMemo(() => {
    // If using API and we have a query
    if (shouldUseApi && filters.query.length >= 2) {
      // Use cached results if available, otherwise current API results
      const baseResults = lastSearchResultsRef.current.length > 0
        ? lastSearchResultsRef.current
        : podcasts

      // Filter by current query (including partial words)
      const textFiltered = filterByQueryText(baseResults, filters.query)

      // Apply other local filters
      const filteredPodcasts = applyLocalFilters(textFiltered, filters)

      // Convert API episodes to EpisodeWithPodcast format
      const episodesWithPodcast: EpisodeWithPodcast[] = episodes.map(ep => {
        const extendedEp = ep as Episode & {
          podcastTitle?: string
          podcastAuthor?: string
          podcastImage?: string
        }
        return {
          ...ep,
          podcast: extendedEp.podcastTitle ? {
            id: ep.podcastId,
            title: extendedEp.podcastTitle,
            author: extendedEp.podcastAuthor || '',
            description: '',
            imageUrl: extendedEp.podcastImage || '',
            feedUrl: '',
            categories: [],
            language: '',
            episodeCount: 0,
            lastUpdated: '',
            rating: 0,
            explicit: false
          } : undefined
        }
      })

      return {
        podcasts: filteredPodcasts,
        episodes: episodesWithPodcast
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
    clearResults()
  }, [clearResults])

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
 * Normalize text for search comparison (handles æøå)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Filter podcasts by query text - matches if ALL words are found as prefixes
 * "hele hi" matches "Hele historien" because "hele" matches "hele" and "hi" matches "historien"
 */
function filterByQueryText(podcasts: Podcast[], query: string): Podcast[] {
  if (!query.trim()) return podcasts

  const words = query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return podcasts

  return podcasts.filter(podcast => {
    const searchText = normalizeText(`${podcast.title} ${podcast.author} ${podcast.description}`)
    const searchWords = searchText.split(/\s+/)

    // Each query word must match as prefix of some word in text
    return words.every(queryWord => {
      const normalizedQuery = normalizeText(queryWord)
      return searchWords.some(textWord => textWord.startsWith(normalizedQuery))
    })
  })
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
