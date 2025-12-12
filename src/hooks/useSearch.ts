import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react'
import type { Podcast, Episode, SearchFilters, DateFilter } from '../types/podcast'
import { type EpisodeWithPodcast } from '../utils/search'
import type { TabType } from '../components/TabBar'
import {
  searchPodcasts as apiSearchPodcasts,
  searchEpisodesByPerson,
  getEpisodesByFeedId,
  getTrendingPodcasts,
  getRecentEpisodes,
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
      // Parse query to extract only positive terms for API
      // (exclusions like -word are handled client-side)
      const parsed = parseSearchQuery(query)
      const positiveTerms = [
        ...parsed.mustInclude,
        ...parsed.shouldInclude,
        ...parsed.exactPhrases.map(p => `"${p}"`)
      ]

      // If only exclusions with no positive terms, we can't search the API
      // Return empty results - user needs to provide something to search for
      if (positiveTerms.length === 0) {
        setApiPodcasts([])
        setApiEpisodes([])
        setIsLoading(false)
        return
      }

      const apiQuery = positiveTerms.join(' ')

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
        apiSearchPodcasts(apiQuery, searchOptions),
        isListenNotesAvailable()
          ? listenNotesSearchPodcasts(apiQuery, {
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
            const listenNotesRes = await listenNotesSearchEpisodes(apiQuery, {
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
          const episodesRes = await searchEpisodesByPerson(apiQuery, { max: 50, fulltext: true })

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
        // Only include episodes where the search term appears in episode title/description
        // (not just in podcast name)
        if (podcasts.length > 0) {
          const topPodcasts = podcasts.slice(0, 10)

          // Calculate since timestamp if year filter is active
          const sinceTimestamp = filters.dateFrom
            ? Math.floor(new Date(filters.dateFrom.year, filters.dateFrom.month - 1, filters.dateFrom.day).getTime() / 1000)
            : undefined

          const episodePromises = topPodcasts.map(async (podcast) => {
            try {
              const episodesRes = await getEpisodesByFeedId(parseInt(podcast.id), { max: 50, since: sinceTimestamp })
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

          // Parse query to get positive search terms
          const parsed = parseSearchQuery(query)

          // Only include episodes where search term appears in title or description
          for (const ep of podcastEpisodes) {
            if (existingIds.has(ep.id)) continue
            const text = `${ep.title} ${ep.description}`.toLowerCase()

            // For exact phrases, check exact match
            const matchesPhrase = parsed.exactPhrases.length === 0 ||
              parsed.exactPhrases.some(phrase => text.includes(phrase.toLowerCase()))

            // For regular terms, at least one must appear in episode text
            const matchesTerm = (parsed.mustInclude.length === 0 && parsed.shouldInclude.length === 0) ||
              [...parsed.mustInclude, ...parsed.shouldInclude].some(term =>
                text.includes(term.toLowerCase())
              )

            if (matchesPhrase && matchesTerm) {
              allEpisodes.push(ep as Episode)
              existingIds.add(ep.id)
            }
          }
        }

        // Apply exclusion filtering for advanced query syntax
        let finalEpisodes = allEpisodes
        const parsedForExclusions = parseSearchQuery(query)
        if (parsedForExclusions.mustExclude.length > 0) {
          finalEpisodes = allEpisodes.filter(ep => {
            const fullText = `${ep.title} ${ep.description}`.toLowerCase()

            for (const term of parsedForExclusions.mustExclude) {
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


  // Browse by filters only (no search query) - fetches trending/recent content
  const browseByFilters = async (browseType: 'podcasts' | 'episodes') => {
    setIsLoading(true)
    setError(null)
    currentSearchRef.current = '__browse__'

    try {
      if (browseType === 'podcasts') {
        // Fetch trending podcasts with category/language filters
        const trendingRes = await getTrendingPodcasts({
          max: 100,
          cat: filters.categories.length > 0 ? filters.categories.join(',') : undefined,
          lang: filters.languages.length > 0 ? filters.languages[0] : undefined
        })

        if (currentSearchRef.current !== '__browse__') return

        let podcasts = transformFeeds(trendingRes.feeds)
        podcasts = podcasts.filter(p => isAllowedLanguage(p.language))

        lastSearchQueryRef.current = ''
        lastSearchResultsRef.current = podcasts
        setApiPodcasts(podcasts)
        setApiEpisodes([])
      } else {
        // For episodes with category filter, we need to:
        // 1. Get podcasts in the selected categories
        // 2. Fetch episodes from those podcasts
        // The /recent/episodes endpoint doesn't support category filtering
        if (filters.categories.length > 0) {
          // First get trending podcasts in the selected categories
          const trendingRes = await getTrendingPodcasts({
            max: 30,
            cat: filters.categories.join(','),
            lang: filters.languages.length > 0 ? filters.languages[0] : undefined
          })

          if (currentSearchRef.current !== '__browse__') return

          const podcasts = transformFeeds(trendingRes.feeds)
            .filter(p => isAllowedLanguage(p.language))

          // Calculate since timestamp if year filter is active
          const sinceTimestamp = filters.dateFrom
            ? Math.floor(new Date(filters.dateFrom.year, filters.dateFrom.month - 1, filters.dateFrom.day).getTime() / 1000)
            : undefined

          // Now fetch episodes from these podcasts
          const allEpisodes: Episode[] = []
          const episodePromises = podcasts.slice(0, 15).map(async (podcast) => {
            try {
              const episodesRes = await getEpisodesByFeedId(parseInt(podcast.id), { max: 20, since: sinceTimestamp })
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
          for (const eps of episodeResults) {
            allEpisodes.push(...eps)
          }

          // Sort by publish date (newest first)
          allEpisodes.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime()
            const dateB = new Date(b.publishedAt).getTime()
            return dateB - dateA
          })

          setApiPodcasts([])
          setApiEpisodes(allEpisodes.slice(0, 100) as Episode[])
        } else {
          // No category filter - fetch recent episodes
          const recentRes = await getRecentEpisodes({
            max: 100,
            fulltext: true
          })

          if (currentSearchRef.current !== '__browse__') return

          const episodes = transformEpisodes(recentRes.items || [])
          const episodesWithMeta = episodes.map((ep, idx) => {
            const apiEp = recentRes.items?.[idx]
            return {
              ...ep,
              podcastTitle: apiEp?.feedTitle || '',
              podcastAuthor: apiEp?.feedAuthor || '',
              podcastImage: apiEp?.feedImage || '',
              feedLanguage: apiEp?.feedLanguage || ''
            }
          }).filter(ep => isAllowedLanguage(ep.feedLanguage))

          setApiPodcasts([])
          setApiEpisodes(episodesWithMeta as Episode[])
        }
      }
    } catch {
      if (currentSearchRef.current === '__browse__') {
        setError('Kunne ikke hente innhold. Prøv igjen.')
      }
    } finally {
      if (currentSearchRef.current === '__browse__') {
        setIsLoading(false)
      }
    }
  }

  // Track filters for re-triggering API search
  const filtersRef = useRef({ languages: filters.languages, categories: filters.categories })

  // Check if any browse-relevant filters are active
  const hasActiveFilters = filters.categories.length > 0 || filters.languages.length > 0

  // Debounced API search or filter-only browse
  useEffect(() => {
    if (!shouldUseApi) return
    // Don't search/browse when on queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return

    const query = filters.query.trim()

    // If query is empty but filters are active, browse by filters
    if (query.length === 0) {
      if (hasActiveFilters) {
        const browseTab = activeTab === 'episodes' ? 'episodes' : 'podcasts'
        const timer = setTimeout(() => {
          browseByFilters(browseTab)
        }, 300)
        return () => clearTimeout(timer)
      }
      clearResults()
      return
    }

    // If query is too short, do nothing
    if (query.length < 2) return

    // Debounce the search - use full query (not just complete words)
    // This ensures "inga strümke" searches for both words
    const searchTab = activeTab === 'episodes' ? 'episodes' : 'podcasts'
    const timer = setTimeout(() => {
      searchViaApi(query, searchTab)
    }, 400) // Slightly longer debounce to wait for typing to finish

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, shouldUseApi, clearResults, activeTab, hasActiveFilters])

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
    // Helper to convert episodes to EpisodeWithPodcast format
    const convertEpisodes = (): EpisodeWithPodcast[] => {
      return episodes.map(ep => {
        const extendedEp = ep as Episode & {
          podcastTitle?: string
          podcastAuthor?: string
          podcastImage?: string
          feedLanguage?: string
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
            language: extendedEp.feedLanguage || '',
            episodeCount: 0,
            lastUpdated: '',
            rating: 0,
            explicit: false
          } : undefined
        }
      })
    }

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

      // Convert and filter episodes
      const episodesWithPodcast = convertEpisodes()
      const filteredEpisodes = applyLocalFiltersToEpisodes(episodesWithPodcast, filters)

      return {
        podcasts: filteredPodcasts,
        episodes: filteredEpisodes
      }
    }

    // Filter-only browsing (no query but has filters)
    if (shouldUseApi && hasActiveFilters && (podcasts.length > 0 || episodes.length > 0)) {
      // Apply local filters to browsed results
      const filteredPodcasts = applyLocalFilters(podcasts, filters)
      const episodesWithPodcast = convertEpisodes()
      const filteredEpisodes = applyLocalFiltersToEpisodes(episodesWithPodcast, filters)

      return {
        podcasts: filteredPodcasts,
        episodes: filteredEpisodes
      }
    }

    // No query or API not configured - return empty results
    return {
      podcasts: [],
      episodes: []
    }
  }, [podcasts, episodes, filters, shouldUseApi, hasActiveFilters])

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

  const setDateFrom = useCallback((date: DateFilter | null) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, dateFrom: date }))
    })
  }, [])

  const setDateTo = useCallback((date: DateFilter | null) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, dateTo: date }))
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
 * Filter podcasts by query text - matches if ALL positive words are found as prefixes
 * and NONE of the excluded words are present.
 * "hele hi" matches "Hele historien" because "hele" matches "hele" and "hi" matches "historien"
 * "takk -lov" matches podcasts with "takk" but NOT containing "lov"
 */
function filterByQueryText(podcasts: Podcast[], query: string): Podcast[] {
  if (!query.trim()) return podcasts

  const parsed = parseSearchQuery(query)

  const excludeTerms = parsed.mustExclude
  const exactPhrases = parsed.exactPhrases
  const hasPositiveTerms = parsed.mustInclude.length > 0 || parsed.shouldInclude.length > 0 || exactPhrases.length > 0

  // If no positive terms and no exclusions, return all
  // If only exclusions, we still need to filter
  if (!hasPositiveTerms && excludeTerms.length === 0) return podcasts

  return podcasts.filter(podcast => {
    const searchText = normalizeText(`${podcast.title} ${podcast.author} ${podcast.description}`)
    const searchWords = searchText.split(/\s+/)

    // Check exact phrases - must all be present
    for (const phrase of exactPhrases) {
      if (!searchText.includes(normalizeText(phrase))) return false
    }

    // Check excluded terms - if any present, reject
    for (const term of excludeTerms) {
      if (searchText.includes(normalizeText(term))) return false
    }

    // Check positive terms - each must match as prefix of some word in text
    // For OR queries (shouldInclude), at least one must match
    if (parsed.shouldInclude.length > 0) {
      const hasOrMatch = parsed.shouldInclude.some(term => {
        const normalizedTerm = normalizeText(term)
        return searchWords.some(textWord => textWord.startsWith(normalizedTerm))
      })
      if (!hasOrMatch) return false
    }

    // For AND queries (mustInclude), all must match
    for (const term of parsed.mustInclude) {
      const normalizedTerm = normalizeText(term)
      const found = searchWords.some(textWord => textWord.startsWith(normalizedTerm))
      if (!found) return false
    }

    return true
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
    const fromDate = new Date(filters.dateFrom.year, filters.dateFrom.month - 1, filters.dateFrom.day)
    filtered = filtered.filter(p => {
      const podcastDate = new Date(p.lastUpdated)
      return podcastDate >= fromDate
    })
  }
  if (filters.dateTo !== null) {
    const toDate = new Date(filters.dateTo.year, filters.dateTo.month - 1, filters.dateTo.day, 23, 59, 59)
    filtered = filtered.filter(p => {
      const podcastDate = new Date(p.lastUpdated)
      return podcastDate <= toDate
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

/**
 * Apply local filters to episodes
 */
function applyLocalFiltersToEpisodes(episodes: EpisodeWithPodcast[], filters: SearchFilters): EpisodeWithPodcast[] {
  let filtered = [...episodes]

  // Filter by languages (using podcast language)
  if (filters.languages.length > 0) {
    filtered = filtered.filter(ep =>
      ep.podcast && filters.languages.some(l =>
        ep.podcast!.language.toLowerCase().includes(l.toLowerCase())
      )
    )
  }

  // Filter by date range (based on publishedAt)
  if (filters.dateFrom !== null) {
    const fromDate = new Date(filters.dateFrom.year, filters.dateFrom.month - 1, filters.dateFrom.day)
    filtered = filtered.filter(ep => {
      const episodeDate = new Date(ep.publishedAt)
      return episodeDate >= fromDate
    })
  }
  if (filters.dateTo !== null) {
    const toDate = new Date(filters.dateTo.year, filters.dateTo.month - 1, filters.dateTo.day, 23, 59, 59)
    filtered = filtered.filter(ep => {
      const episodeDate = new Date(ep.publishedAt)
      return episodeDate <= toDate
    })
  }

  // Filter by explicit (using podcast explicit flag if available)
  if (filters.explicit !== null) {
    filtered = filtered.filter(ep =>
      ep.podcast ? ep.podcast.explicit === filters.explicit : true
    )
  }

  return filtered
}
