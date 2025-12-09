import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react'
import type { Podcast, Episode, SearchFilters } from '../types/podcast'
import { type EpisodeWithPodcast } from '../utils/search'
import type { TabType } from '../components/TabBar'
import {
  searchPodcasts as apiSearchPodcasts,
  searchEpisodesByPerson,
  getEpisodesByFeedId,
  isConfigured,
  type SearchOptions
} from '../services/podcastIndex'
import {
  searchEpisodes as listenNotesSearchEpisodes,
  searchPodcasts as listenNotesSearchPodcasts,
  isAvailable as isListenNotesAvailable,
  type ListenNotesPodcast
} from '../services/listenNotes'
import { transformFeeds, transformEpisodes } from '../services/podcastTransform'
import { parseSearchQuery } from '../utils/search'

const initialFilters: SearchFilters = {
  query: '',
  categories: [],
  languages: [],
  maxDuration: null,
  sortBy: 'relevance',
  explicit: null,
  dateFrom: null,
  dateTo: null
}

export interface SearchResultsState {
  podcasts: Podcast[]
  episodes: EpisodeWithPodcast[]
}

export function useSearch() {

  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabType>('podcasts')

  // API state
  const [apiPodcasts, setApiPodcasts] = useState<Podcast[]>([])
  const [apiEpisodes, setApiEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Always use API
  const shouldUseApi = isConfigured()

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
  // These are applied by default to filter out German, Spanish, etc.
  const ALLOWED_LANGUAGES = ['no', 'nb', 'nn', 'da', 'sv', 'en']
  const ALLOWED_LANGUAGE_NAMES = ['norwegian', 'danish', 'swedish', 'english']

  // Helper to check if a language code is allowed
  const isAllowedLanguage = (langCode: string | undefined): boolean => {
    if (!langCode) return true // Keep if no language specified
    const code = langCode.toLowerCase().slice(0, 2)
    return ALLOWED_LANGUAGES.includes(code)
  }

  // Helper to check if a language name (from Listen Notes) is allowed
  const isAllowedLanguageName = (langName: string | undefined): boolean => {
    if (!langName) return true
    return ALLOWED_LANGUAGE_NAMES.includes(langName.toLowerCase())
  }

  // Transform Listen Notes podcast to our Podcast type
  const transformListenNotesPodcast = (lnPodcast: ListenNotesPodcast): Podcast => ({
    id: `ln_${lnPodcast.id}`, // Prefix to avoid ID collisions
    title: lnPodcast.title_original,
    author: lnPodcast.publisher_original,
    description: lnPodcast.description_original,
    imageUrl: lnPodcast.image || lnPodcast.thumbnail || '/favicon.svg',
    feedUrl: lnPodcast.rss || '',
    categories: [],
    language: lnPodcast.language || 'Unknown',
    episodeCount: lnPodcast.total_episodes || 0,
    lastUpdated: lnPodcast.latest_pub_date_ms
      ? new Date(lnPodcast.latest_pub_date_ms).toISOString()
      : new Date().toISOString(),
    rating: 3.5, // Default rating since Listen Notes doesn't provide ratings
    explicit: lnPodcast.explicit_content || false
  })

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

      // Fetch from both APIs in parallel for better results
      const [podcastIndexRes, listenNotesRes] = await Promise.all([
        apiSearchPodcasts(query, searchOptions),
        isListenNotesAvailable()
          ? listenNotesSearchPodcasts(query, {
              sort_by_date: filters.sortBy === 'newest' ? 1 : 0
            }).catch(() => null)
          : Promise.resolve(null)
      ])

      // Only update if this is still the current search
      if (currentSearchRef.current !== query) {
        return
      }

      // Transform and filter Podcast Index results by allowed languages
      let podcasts = transformFeeds(podcastIndexRes.feeds)
      podcasts = podcasts.filter(p => isAllowedLanguage(p.language))

      // Track titles for deduplication (case-insensitive)
      const seenTitles = new Set(podcasts.map(p => p.title.toLowerCase().trim()))

      // Add Listen Notes results that aren't duplicates
      if (listenNotesRes?.results) {
        for (const lnPodcast of listenNotesRes.results) {
          // Skip if not in allowed language
          if (!isAllowedLanguageName(lnPodcast.language)) continue

          // Skip if we already have a podcast with same title (deduplication)
          const normalizedTitle = lnPodcast.title_original.toLowerCase().trim()
          if (seenTitles.has(normalizedTitle)) continue

          seenTitles.add(normalizedTitle)
          podcasts.push(transformListenNotesPodcast(lnPodcast))
        }
      }

      // Store for incremental filtering
      lastSearchQueryRef.current = query
      lastSearchResultsRef.current = podcasts

      setApiPodcasts(podcasts)

      // For episode search, use Listen Notes API (full-text search) as primary
      // Fall back to Podcast Index if Listen Notes fails
      if (searchType === 'episodes') {
        const allEpisodes: Episode[] = []
        const existingIds = new Set<string>()

        // Strategy 1: Listen Notes API - best full-text episode search
        if (isListenNotesAvailable()) {
          try {
            const listenNotesRes = await listenNotesSearchEpisodes(query, {
              sort_by_date: filters.sortBy === 'newest' ? 1 : 0
            })

            // Only update if this is still the current search
            if (currentSearchRef.current !== query) {
              return
            }

            // Transform Listen Notes results to our Episode format
            for (const ep of listenNotesRes.results) {
              const episode: Episode & {
                podcastTitle: string
                podcastAuthor: string
                podcastImage: string
                feedLanguage: string
              } = {
                id: ep.id,
                podcastId: ep.podcast.id,
                title: ep.title_original,
                description: ep.description_original,
                audioUrl: ep.audio,
                duration: ep.audio_length_sec,
                publishedAt: new Date(ep.pub_date_ms).toISOString(),
                imageUrl: ep.image || ep.thumbnail,
                podcastTitle: ep.podcast.title_original,
                podcastAuthor: ep.podcast.publisher_original,
                podcastImage: ep.podcast.image || ep.podcast.thumbnail,
                feedLanguage: '' // Listen Notes already filtered by language
              }
              allEpisodes.push(episode)
              existingIds.add(ep.id)
            }
          } catch {
            // Continue to fallback strategies
          }
        }

        // Strategy 2: Podcast Index byperson API
        // Searches person tags, episode title, description, feed owner/author
        try {
          const episodesRes = await searchEpisodesByPerson(query, { max: 50, fulltext: true })

          if (currentSearchRef.current !== query) {
            return
          }

          const episodes = transformEpisodes(episodesRes.items || [])

          for (let idx = 0; idx < episodes.length; idx++) {
            const ep = episodes[idx]
            const apiEp = episodesRes.items?.[idx]

            // Skip if already have this episode or wrong language
            if (existingIds.has(ep.id)) continue
            if (!isAllowedLanguage(apiEp?.feedLanguage)) continue

            allEpisodes.push({
              ...ep,
              podcastTitle: apiEp?.feedTitle || '',
              podcastAuthor: apiEp?.feedAuthor || '',
              podcastImage: apiEp?.feedImage || '',
              feedLanguage: apiEp?.feedLanguage || ''
            } as Episode)
            existingIds.add(ep.id)
          }
        } catch {
          // Continue to strategy 3
        }

        // Strategy 3: Fetch episodes from matching podcasts and filter by query
        // This is the main strategy for finding episodes about a topic
        if (podcasts.length > 0) {
          const topPodcasts = podcasts.slice(0, 10) // Search more podcasts
          const episodePromises = topPodcasts.map(async (podcast) => {
            try {
              const episodesRes = await getEpisodesByFeedId(parseInt(podcast.id), 30) // More episodes per podcast
              const episodes = transformEpisodes(episodesRes.items || [])
              return episodes.map(ep => ({
                ...ep,
                podcastTitle: podcast.title,
                podcastAuthor: podcast.author,
                podcastImage: podcast.imageUrl,
                feedLanguage: podcast.language
              }))
            } catch {
              return []
            }
          })
          const episodeResults = await Promise.all(episodePromises)
          const podcastEpisodes = episodeResults.flat()

          // Filter by query terms in title or description
          const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
          for (const ep of podcastEpisodes) {
            if (existingIds.has(ep.id)) continue
            const text = `${ep.title} ${ep.description}`.toLowerCase()
            // Episode must contain at least one query word
            if (queryWords.some(word => text.includes(word))) {
              allEpisodes.push(ep as Episode)
              existingIds.add(ep.id)
            }
          }
        }

        // Apply local text filtering for advanced query syntax
        let finalEpisodes = allEpisodes
        const parsed = parseSearchQuery(query)
        if (parsed.exactPhrases.length > 0 || parsed.mustExclude.length > 0) {
          finalEpisodes = allEpisodes.filter(ep => {
            const fullText = `${ep.title} ${ep.description}`.toLowerCase()

            for (const phrase of parsed.exactPhrases) {
              if (!fullText.includes(phrase)) return false
            }

            for (const term of parsed.mustExclude) {
              if (fullText.includes(term)) return false
            }

            return true
          })
        }

        // Sort by publish date (newest first) unless relevance
        if (filters.sortBy !== 'relevance') {
          finalEpisodes.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime()
            const dateB = new Date(b.publishedAt).getTime()
            return filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA
          })
        }

        setApiEpisodes(finalEpisodes)
      } else {
        setApiEpisodes([])
      }
    } catch {
      // Only show error if this is still the current search
      if (currentSearchRef.current === query) {
        setError('Søket feilet. Prøv igjen.')
      }
    } finally {
      // Only stop loading if this is still the current search
      if (currentSearchRef.current === query) {
        setIsLoading(false)
      }
    }
  }


  // Track filters for re-triggering API search
  const filtersRef = useRef({ languages: filters.languages, categories: filters.categories })

  // Debounced API search
  useEffect(() => {
    if (!shouldUseApi) return

    const query = filters.query.trim()

    // If query is empty, clear results
    if (query.length === 0) {
      clearResults()
      return
    }

    // If query is too short, do nothing
    if (query.length < 2) return

    // Debounce the search - use full query (not just complete words)
    // This ensures "inga strümke" searches for both words
    // Only search for podcasts or episodes tabs, not queue or subscriptions
    const searchTab = (activeTab === 'queue' || activeTab === 'subscriptions') ? 'podcasts' : activeTab
    const timer = setTimeout(() => {
      searchViaApi(query, searchTab)
    }, 400) // Slightly longer debounce to wait for typing to finish

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, shouldUseApi, clearResults, activeTab])

  // Re-search when tab changes (if we have a query)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return
    // Don't search when switching to queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return

    // Trigger new search with current query for the new tab
    searchViaApi(filters.query, activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Re-search when language or category filters change (API supports these)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return
    // Don't search when on queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return

    const filtersChanged =
      JSON.stringify(filtersRef.current.languages) !== JSON.stringify(filters.languages) ||
      JSON.stringify(filtersRef.current.categories) !== JSON.stringify(filters.categories)

    if (filtersChanged) {
      filtersRef.current = { languages: filters.languages, categories: filters.categories }
      // Re-trigger API search with updated filters
      const searchTab = activeTab === 'episodes' ? 'episodes' : 'podcasts'
      const timer = setTimeout(() => {
        searchViaApi(filters.query, searchTab)
      }, 200)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.languages, filters.categories, filters.query, activeTab, shouldUseApi])

  // Use API results
  const podcasts = apiPodcasts
  const episodes = apiEpisodes

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

    // No query or API not configured - return empty results
    return {
      podcasts: [],
      episodes: []
    }
  }, [podcasts, episodes, filters, shouldUseApi])

  const setQuery = useCallback((query: string) => {
    // Don't use startTransition for query updates - it breaks IME/dead key composition
    // (e.g., typing ü with Option+u on macOS)
    setFilters(prev => ({ ...prev, query }))
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

  const setDateFrom = useCallback((year: number | null) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, dateFrom: year }))
    })
  }, [])

  const setDateTo = useCallback((year: number | null) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, dateTo: year }))
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
    if (filters.explicit !== null) count++
    if (filters.dateFrom !== null || filters.dateTo !== null) count++
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
    setDateFrom,
    setDateTo,
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

  // Filter by date range (based on lastUpdated)
  if (filters.dateFrom !== null) {
    filtered = filtered.filter(p => {
      const year = new Date(p.lastUpdated).getFullYear()
      return year >= filters.dateFrom!
    })
  }
  if (filters.dateTo !== null) {
    filtered = filtered.filter(p => {
      const year = new Date(p.lastUpdated).getFullYear()
      return year <= filters.dateTo!
    })
  }

  // Filter by explicit
  if (filters.explicit !== null) {
    filtered = filtered.filter(p => p.explicit === filters.explicit)
  }

  // Sort
  switch (filters.sortBy) {
    case 'newest':
      filtered.sort((a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
      break
    case 'oldest':
      filtered.sort((a, b) =>
        new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      )
      break
    case 'popular':
      filtered.sort((a, b) => b.episodeCount - a.episodeCount)
      break
    // 'relevance' keeps API order
  }

  return filtered
}
