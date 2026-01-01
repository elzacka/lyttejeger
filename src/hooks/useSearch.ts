import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react';
import type { Podcast, Episode, SearchFilters, DateFilter, DiscoveryMode } from '../types/podcast';
import { type EpisodeWithPodcast } from '../utils/search';
import type { TabType } from '../components/TabBar';
import {
  searchPodcasts as apiSearchPodcasts,
  searchPodcastsByTitle,
  searchEpisodesByPerson,
  getEpisodesByFeedIds,
  getTrendingPodcasts,
  getRecentEpisodes,
  isConfigured,
  type SearchOptions,
} from '../services/podcastIndex';
import { transformFeeds, transformEpisodes } from '../services/podcastTransform';
import { parseSearchQuery } from '../utils/search';

const initialFilters: SearchFilters = {
  query: '',
  categories: [],
  excludeCategories: [],
  languages: [],
  maxDuration: null,
  sortBy: 'relevance',
  explicit: null,
  dateFrom: null,
  dateTo: null,
  discoveryMode: 'all',
};

export interface SearchResultsState {
  podcasts: Podcast[];
  episodes: EpisodeWithPodcast[];
}

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>('podcasts');

  // API state
  const [apiPodcasts, setApiPodcasts] = useState<Podcast[]>([]);
  const [apiEpisodes, setApiEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  // Always use API
  const shouldUseApi = isConfigured();

  // Track current search to prevent race conditions
  const currentSearchRef = useRef<string>('');

  // Store last successful search results for incremental filtering
  const lastSearchQueryRef = useRef<string>('');
  const lastSearchResultsRef = useRef<Podcast[]>([]);

  // Clear results when query is empty
  const clearResults = useCallback(() => {
    setApiPodcasts([]);
    setApiEpisodes([]);
    lastSearchQueryRef.current = '';
    lastSearchResultsRef.current = [];
  }, []);

  // Allowed language codes for API filter (Norwegian, Danish, Swedish, English)
  const ALLOWED_LANGUAGES_API = 'no,nb,nn,da,sv,en';

  // Check if a language code is allowed (for client-side filtering)
  const isAllowedLanguage = (langCode: string | undefined): boolean => {
    if (!langCode) return true;
    const code = langCode.toLowerCase().slice(0, 2);
    return ['no', 'nb', 'nn', 'da', 'sv', 'en'].includes(code);
  };

  // Search via API with enhanced options
  const searchViaApi = async (query: string, searchType: 'podcasts' | 'episodes') => {
    if (!query.trim()) {
      clearResults();
      return;
    }

    // Track this search to prevent race conditions
    currentSearchRef.current = query;

    setIsLoading(true);
    setError(null);
    setSearchWarning(null);

    try {
      // Parse query to extract only positive terms for API
      // (exclusions like -word are handled client-side)
      const parsed = parseSearchQuery(query);

      // Only send complete words (2+ chars) to API - partial words won't match
      // Filter out short terms that would cause API to return no results
      const completeTerms = [
        ...parsed.mustInclude.filter((t) => t.length >= 2),
        ...parsed.shouldInclude.filter((t) => t.length >= 2),
        ...parsed.exactPhrases.map((p) => `"${p}"`),
      ];

      // If no complete terms to search, but we have partial terms,
      // use cached results and filter locally
      if (completeTerms.length === 0) {
        // If we have cached results, filter them with current query
        if (lastSearchResultsRef.current.length > 0) {
          const filtered = filterByQueryText(lastSearchResultsRef.current, query);
          setApiPodcasts(filtered);
          setIsLoading(false);
          return;
        }
        // No cached results and no complete terms - clear results
        setApiPodcasts([]);
        setApiEpisodes([]);
        setIsLoading(false);
        return;
      }

      const apiQuery = completeTerms.join(' ');

      // Build search options based on current filters
      const searchOptions: SearchOptions = {
        max: 200, // Fetch more to ensure complete results
        fulltext: true, // Get full descriptions
        clean: filters.explicit === false ? true : undefined, // Only filter explicit if user chose "family-friendly"
        lang: ALLOWED_LANGUAGES_API, // Send language filter to API
      };

      // Add category filter if selected
      if (filters.categories.length > 0) {
        searchOptions.cat = filters.categories.join(',');
      }

      // Add discovery mode filter for finding hidden gems
      if (filters.discoveryMode === 'value4value') {
        searchOptions.val = 'any'; // Podcasts supporting value4value (Bitcoin/Lightning)
      } else if (filters.discoveryMode === 'indie') {
        searchOptions.aponly = false; // Not on Apple = more indie
      }

      // Hybrid search strategy:
      // 1. First try exact title match for precision
      // 2. Then broader term search for completeness
      // 3. Merge and deduplicate results, prioritizing title matches
      let allFeeds: typeof podcastIndexRes.feeds = [];
      const seenIds = new Set<number>();

      // Try exact title search first (more precise)
      try {
        const titleRes = await searchPodcastsByTitle(apiQuery, {
          ...searchOptions,
          max: 50, // Smaller batch for title search
        });
        for (const feed of titleRes.feeds || []) {
          if (!seenIds.has(feed.id)) {
            seenIds.add(feed.id);
            allFeeds.push(feed);
          }
        }
      } catch {
        // Title search failed, continue with term search only
      }

      if (currentSearchRef.current !== query) return;

      // Broader term search for completeness
      const podcastIndexRes = await apiSearchPodcasts(apiQuery, searchOptions);
      for (const feed of podcastIndexRes.feeds || []) {
        if (!seenIds.has(feed.id)) {
          seenIds.add(feed.id);
          allFeeds.push(feed);
        }
      }

      if (currentSearchRef.current !== query) return;

      // Transform and filter: remove dead feeds, then language filter as backup
      const podcasts = transformFeeds(allFeeds).filter((p) => isAllowedLanguage(p.language));

      // Store for incremental filtering
      lastSearchQueryRef.current = query;
      lastSearchResultsRef.current = podcasts;

      setApiPodcasts(podcasts);

      // Episode search
      if (searchType === 'episodes') {
        const allEpisodes: Episode[] = [];
        const existingIds = new Set<string>();
        let strategy1Failed = false;
        let strategy2Failed = false;

        // Strategy 1: byperson API - searches person tags, title, description
        try {
          const episodesRes = await searchEpisodesByPerson(apiQuery, { max: 50, fulltext: true });

          if (currentSearchRef.current !== query) {
            return;
          }

          const episodes = transformEpisodes(episodesRes.items || []);

          for (let idx = 0; idx < episodes.length; idx++) {
            const ep = episodes[idx];
            const apiEp = episodesRes.items?.[idx];

            // Skip if already have this episode or wrong language
            if (existingIds.has(ep.id)) continue;
            if (!isAllowedLanguage(apiEp?.feedLanguage)) continue;

            allEpisodes.push({
              ...ep,
              podcastTitle: apiEp?.feedTitle || '',
              podcastAuthor: apiEp?.feedAuthor || '',
              podcastImage: apiEp?.feedImage || '',
              feedLanguage: apiEp?.feedLanguage || '',
            } as Episode);
            existingIds.add(ep.id);
          }
        } catch {
          strategy1Failed = true;
          // Continue to strategy 2
        }

        // Strategy 2: Fetch episodes from matching podcasts using batch API
        if (podcasts.length > 0) {
          const topPodcasts = podcasts.slice(0, 20); // Can fetch more with batch
          const feedIds = topPodcasts.map((p) => parseInt(p.id));

          // Calculate since timestamp if year filter is active
          const sinceTimestamp = filters.dateFrom
            ? Math.floor(
                new Date(
                  filters.dateFrom.year,
                  filters.dateFrom.month - 1,
                  filters.dateFrom.day
                ).getTime() / 1000
              )
            : undefined;

          // Create a map of podcast info by feed ID for quick lookup
          const podcastMap = new Map(topPodcasts.map((p) => [p.id, p]));

          try {
            // Single batch API call instead of N parallel calls
            const episodesRes = await getEpisodesByFeedIds(feedIds, {
              max: 200, // More episodes with single call
              since: sinceTimestamp,
            });

            const episodes = transformEpisodes(episodesRes.items || []);
            const podcastEpisodes = episodes.map((ep, idx) => {
              const apiEp = episodesRes.items?.[idx];
              const podcast = podcastMap.get(String(apiEp?.feedId));
              return {
                ...ep,
                podcastTitle: podcast?.title || apiEp?.feedTitle || '',
                podcastAuthor: podcast?.author || apiEp?.feedAuthor || '',
                podcastImage: podcast?.imageUrl || apiEp?.feedImage || '',
                feedLanguage: podcast?.language || apiEp?.feedLanguage || '',
              };
            });

            // Parse query to get positive search terms
            const parsed = parseSearchQuery(query);

            // Only include episodes where search term appears in title or description
            for (const ep of podcastEpisodes) {
              if (existingIds.has(ep.id)) continue;
              const text = `${ep.title} ${ep.description}`.toLowerCase();

              // For exact phrases, check exact match
              const matchesPhrase =
                parsed.exactPhrases.length === 0 ||
                parsed.exactPhrases.some((phrase) => text.includes(phrase.toLowerCase()));

              // For regular terms, at least one must appear in episode text
              const matchesTerm =
                (parsed.mustInclude.length === 0 && parsed.shouldInclude.length === 0) ||
                [...parsed.mustInclude, ...parsed.shouldInclude].some((term) =>
                  text.includes(term.toLowerCase())
                );

              if (matchesPhrase && matchesTerm) {
                allEpisodes.push(ep as Episode);
                existingIds.add(ep.id);
              }
            }
          } catch {
            strategy2Failed = true;
          }
        }

        // Apply exclusion filtering for advanced query syntax
        let finalEpisodes = allEpisodes;
        const parsedForExclusions = parseSearchQuery(query);
        if (parsedForExclusions.mustExclude.length > 0) {
          finalEpisodes = allEpisodes.filter((ep) => {
            const fullText = `${ep.title} ${ep.description}`.toLowerCase();

            for (const term of parsedForExclusions.mustExclude) {
              if (fullText.includes(term)) return false;
            }

            return true;
          });
        }

        // Sort by publish date (newest first) unless relevance
        if (filters.sortBy !== 'relevance') {
          finalEpisodes.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
          });
        }

        // Set warning if search was incomplete
        if (strategy1Failed && strategy2Failed) {
          setSearchWarning('Søket ga ufullstendige resultater. Prøv igjen senere.');
        } else if (strategy1Failed || strategy2Failed) {
          setSearchWarning('Noen episoder kan mangle fra resultatene.');
        }

        setApiEpisodes(finalEpisodes);
      } else {
        setApiEpisodes([]);
      }
    } catch {
      // Only show error if this is still the current search
      if (currentSearchRef.current === query) {
        setError('Søket feilet. Prøv igjen.');
      }
    } finally {
      // Only stop loading if this is still the current search
      if (currentSearchRef.current === query) {
        setIsLoading(false);
      }
    }
  };

  // Browse by filters only (no search query) - fetches trending/recent content
  const browseByFilters = async (browseType: 'podcasts' | 'episodes') => {
    setIsLoading(true);
    setError(null);
    currentSearchRef.current = '__browse__';

    try {
      if (browseType === 'podcasts') {
        // Fetch trending podcasts with category/language filters
        const trendingRes = await getTrendingPodcasts({
          max: 100,
          cat: filters.categories.length > 0 ? filters.categories.join(',') : undefined,
          notcat:
            filters.excludeCategories.length > 0 ? filters.excludeCategories.join(',') : undefined,
          lang: filters.languages.length > 0 ? filters.languages[0] : undefined,
        });

        if (currentSearchRef.current !== '__browse__') return;

        let podcasts = transformFeeds(trendingRes.feeds);
        podcasts = podcasts.filter((p) => isAllowedLanguage(p.language));

        lastSearchQueryRef.current = '';
        lastSearchResultsRef.current = podcasts;
        setApiPodcasts(podcasts);
        setApiEpisodes([]);
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
            notcat:
              filters.excludeCategories.length > 0
                ? filters.excludeCategories.join(',')
                : undefined,
            lang: filters.languages.length > 0 ? filters.languages[0] : undefined,
          });

          if (currentSearchRef.current !== '__browse__') return;

          const podcasts = transformFeeds(trendingRes.feeds).filter((p) =>
            isAllowedLanguage(p.language)
          );

          // Calculate since timestamp if year filter is active
          const sinceTimestamp = filters.dateFrom
            ? Math.floor(
                new Date(
                  filters.dateFrom.year,
                  filters.dateFrom.month - 1,
                  filters.dateFrom.day
                ).getTime() / 1000
              )
            : undefined;

          // Fetch episodes from these podcasts using batch API
          const topPodcasts = podcasts.slice(0, 20);
          const feedIds = topPodcasts.map((p) => parseInt(p.id));
          const podcastMap = new Map(topPodcasts.map((p) => [p.id, p]));

          let allEpisodes: Episode[] = [];
          try {
            const episodesRes = await getEpisodesByFeedIds(feedIds, {
              max: 100,
              since: sinceTimestamp,
            });

            const episodes = transformEpisodes(episodesRes.items || []);
            allEpisodes = episodes.map((ep, idx) => {
              const apiEp = episodesRes.items?.[idx];
              const podcast = podcastMap.get(String(apiEp?.feedId));
              return {
                ...ep,
                podcastTitle: podcast?.title || apiEp?.feedTitle || '',
                podcastAuthor: podcast?.author || apiEp?.feedAuthor || '',
                podcastImage: podcast?.imageUrl || apiEp?.feedImage || '',
                feedLanguage: podcast?.language || apiEp?.feedLanguage || '',
              } as Episode;
            });
          } catch {
            // Silent fail - empty results
          }

          // Sort by publish date (newest first)
          allEpisodes.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return dateB - dateA;
          });

          setApiPodcasts([]);
          setApiEpisodes(allEpisodes.slice(0, 100) as Episode[]);
        } else {
          // No category filter - fetch recent episodes
          const recentRes = await getRecentEpisodes({
            max: 100,
            fulltext: true,
          });

          if (currentSearchRef.current !== '__browse__') return;

          const episodes = transformEpisodes(recentRes.items || []);
          const episodesWithMeta = episodes
            .map((ep, idx) => {
              const apiEp = recentRes.items?.[idx];
              return {
                ...ep,
                podcastTitle: apiEp?.feedTitle || '',
                podcastAuthor: apiEp?.feedAuthor || '',
                podcastImage: apiEp?.feedImage || '',
                feedLanguage: apiEp?.feedLanguage || '',
              };
            })
            .filter((ep) => isAllowedLanguage(ep.feedLanguage));

          setApiPodcasts([]);
          setApiEpisodes(episodesWithMeta as Episode[]);
        }
      }
    } catch {
      if (currentSearchRef.current === '__browse__') {
        setError('Kunne ikke hente innhold. Prøv igjen.');
      }
    } finally {
      if (currentSearchRef.current === '__browse__') {
        setIsLoading(false);
      }
    }
  };

  // Track filters for re-triggering API search
  const filtersRef = useRef({
    languages: filters.languages,
    categories: filters.categories,
    discoveryMode: filters.discoveryMode,
  });

  // Check if any browse-relevant filters are active
  const hasActiveFilters =
    filters.categories.length > 0 || filters.languages.length > 0 || filters.dateFrom !== null;

  // Debounced API search or filter-only browse
  useEffect(() => {
    if (!shouldUseApi) return;
    // Don't search/browse when on queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return;

    const query = filters.query.trim();

    // If query is empty but filters are active, browse by filters
    if (query.length === 0) {
      if (hasActiveFilters) {
        const browseTab = activeTab === 'episodes' ? 'episodes' : 'podcasts';
        const timer = setTimeout(() => {
          browseByFilters(browseTab);
        }, 300);
        return () => clearTimeout(timer);
      }
      clearResults();
      return;
    }

    // If query is too short, do nothing
    if (query.length < 2) return;

    // Debounce the search - use full query (not just complete words)
    // This ensures "inga strümke" searches for both words
    const searchTab = activeTab === 'episodes' ? 'episodes' : 'podcasts';
    const timer = setTimeout(() => {
      searchViaApi(query, searchTab);
    }, 400); // Slightly longer debounce to wait for typing to finish

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, shouldUseApi, clearResults, activeTab, hasActiveFilters]);

  // Re-search when tab changes (if we have a query)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return;
    // Don't search when switching to queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return;

    // Trigger new search with current query for the new tab
    searchViaApi(filters.query, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Re-search when filters change (language, category, or date)
  useEffect(() => {
    if (!shouldUseApi) return;
    // Don't search when on queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return;

    // For filter-only browsing (no query), changes are handled by the main useEffect above
    // This effect only handles re-search when we have an active query
    if (filters.query.length < 2) return;

    // Shallow array comparison (arrays are small, items are primitives)
    const languagesChanged =
      filtersRef.current.languages.length !== filters.languages.length ||
      filtersRef.current.languages.some((lang, i) => lang !== filters.languages[i]);
    const categoriesChanged =
      filtersRef.current.categories.length !== filters.categories.length ||
      filtersRef.current.categories.some((cat, i) => cat !== filters.categories[i]);
    const discoveryModeChanged = filtersRef.current.discoveryMode !== filters.discoveryMode;
    const filtersChanged = languagesChanged || categoriesChanged || discoveryModeChanged;

    if (filtersChanged) {
      filtersRef.current = {
        languages: filters.languages,
        categories: filters.categories,
        discoveryMode: filters.discoveryMode,
      };
      // Re-trigger API search with updated filters
      const searchTab = activeTab === 'episodes' ? 'episodes' : 'podcasts';
      const timer = setTimeout(() => {
        searchViaApi(filters.query, searchTab);
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.languages,
    filters.categories,
    filters.discoveryMode,
    filters.query,
    activeTab,
    shouldUseApi,
  ]);

  // Use API results
  const podcasts = apiPodcasts;
  const episodes = apiEpisodes;

  // Apply local filters and search
  const results = useMemo(() => {
    // Helper to convert episodes to EpisodeWithPodcast format
    const convertEpisodes = (): EpisodeWithPodcast[] => {
      return episodes.map((ep) => {
        const extendedEp = ep as Episode & {
          podcastTitle?: string;
          podcastAuthor?: string;
          podcastImage?: string;
          feedLanguage?: string;
        };
        return {
          ...ep,
          podcast: extendedEp.podcastTitle
            ? {
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
                explicit: false,
              }
            : undefined,
        };
      });
    };

    // If using API and we have a query
    if (shouldUseApi && filters.query.length >= 2) {
      // Use cached results if available, otherwise current API results
      const baseResults =
        lastSearchResultsRef.current.length > 0 ? lastSearchResultsRef.current : podcasts;

      // Filter by current query (including partial words)
      const textFiltered = filterByQueryText(baseResults, filters.query);

      // Apply other local filters
      const filteredPodcasts = applyLocalFilters(textFiltered, filters);

      // Convert and filter episodes
      const episodesWithPodcast = convertEpisodes();
      const filteredEpisodes = applyLocalFiltersToEpisodes(episodesWithPodcast, filters);

      return {
        podcasts: filteredPodcasts,
        episodes: filteredEpisodes,
      };
    }

    // Filter-only browsing (no query but has filters)
    if (shouldUseApi && hasActiveFilters && (podcasts.length > 0 || episodes.length > 0)) {
      // Apply local filters to browsed results
      const filteredPodcasts = applyLocalFilters(podcasts, filters);
      const episodesWithPodcast = convertEpisodes();
      const filteredEpisodes = applyLocalFiltersToEpisodes(episodesWithPodcast, filters);

      return {
        podcasts: filteredPodcasts,
        episodes: filteredEpisodes,
      };
    }

    // No query or API not configured - return empty results
    return {
      podcasts: [],
      episodes: [],
    };
  }, [podcasts, episodes, filters, shouldUseApi, hasActiveFilters]);

  const setQuery = useCallback((query: string) => {
    // Don't use startTransition for query updates - it breaks IME/dead key composition
    // (e.g., typing ü with Option+u on macOS)
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        categories: prev.categories.includes(category)
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category],
      }));
    });
  }, []);

  const toggleExcludeCategory = useCallback((category: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        excludeCategories: prev.excludeCategories.includes(category)
          ? prev.excludeCategories.filter((c) => c !== category)
          : [...prev.excludeCategories, category],
      }));
    });
  }, []);

  const toggleLanguage = useCallback((language: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        languages: prev.languages.includes(language)
          ? prev.languages.filter((l) => l !== language)
          : [...prev.languages, language],
      }));
    });
  }, []);

  const setDateFrom = useCallback((date: DateFilter | null) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, dateFrom: date }));
    });
  }, []);

  const setDateTo = useCallback((date: DateFilter | null) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, dateTo: date }));
    });
  }, []);

  const setSortBy = useCallback((sortBy: SearchFilters['sortBy']) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, sortBy }));
    });
  }, []);

  const setExplicit = useCallback((explicit: boolean | null) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, explicit }));
    });
  }, []);

  const setDiscoveryMode = useCallback((discoveryMode: DiscoveryMode) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, discoveryMode }));
    });
  }, []);

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setFilters(initialFilters);
    });
    clearResults();
  }, [clearResults]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.excludeCategories.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.explicit !== null) count++;
    if (filters.dateFrom !== null || filters.dateTo !== null) count++;
    if (filters.discoveryMode !== 'all') count++;
    return count;
  }, [filters]);

  return {
    filters,
    results,
    isPending: isPending || isLoading,
    isLoading,
    error,
    searchWarning,
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    toggleExcludeCategory,
    toggleLanguage,
    setDateFrom,
    setDateTo,
    setSortBy,
    setExplicit,
    setDiscoveryMode,
    clearFilters,
    activeFilterCount,
    isApiConfigured: shouldUseApi,
  };
}

/**
 * Normalize text for search comparison (handles æøå)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filter podcasts by query text - matches if ALL positive words are found as substrings
 * and NONE of the excluded words are present.
 * "burde væ" matches "Burde vært pensum" because both terms are found in the text
 * "takk -lov" matches podcasts with "takk" but NOT containing "lov"
 */
function filterByQueryText(podcasts: Podcast[], query: string): Podcast[] {
  if (!query.trim()) return podcasts;

  const parsed = parseSearchQuery(query);

  const excludeTerms = parsed.mustExclude;
  const exactPhrases = parsed.exactPhrases;
  const hasPositiveTerms =
    parsed.mustInclude.length > 0 || parsed.shouldInclude.length > 0 || exactPhrases.length > 0;

  // If no positive terms and no exclusions, return all
  // If only exclusions, we still need to filter
  if (!hasPositiveTerms && excludeTerms.length === 0) return podcasts;

  return podcasts.filter((podcast) => {
    const searchText = normalizeText(`${podcast.title} ${podcast.author} ${podcast.description}`);

    // Check exact phrases - must all be present
    for (const phrase of exactPhrases) {
      if (!searchText.includes(normalizeText(phrase))) return false;
    }

    // Check excluded terms - if any present, reject
    for (const term of excludeTerms) {
      if (searchText.includes(normalizeText(term))) return false;
    }

    // Check positive terms - each must be found as substring in text
    // For OR queries (shouldInclude), at least one must match
    if (parsed.shouldInclude.length > 0) {
      const hasOrMatch = parsed.shouldInclude.some((term) => {
        const normalizedTerm = normalizeText(term);
        return searchText.includes(normalizedTerm);
      });
      if (!hasOrMatch) return false;
    }

    // For AND queries (mustInclude), all must match as substrings
    for (const term of parsed.mustInclude) {
      const normalizedTerm = normalizeText(term);
      if (!searchText.includes(normalizedTerm)) return false;
    }

    return true;
  });
}

/**
 * Apply local filters to already-fetched podcasts
 */
function applyLocalFilters(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let filtered = [...podcasts];

  // Filter by categories
  if (filters.categories.length > 0) {
    filtered = filtered.filter((p) =>
      p.categories.some((c) =>
        filters.categories.some((fc) => c.toLowerCase().includes(fc.toLowerCase()))
      )
    );
  }

  // Filter by languages
  if (filters.languages.length > 0) {
    filtered = filtered.filter((p) =>
      filters.languages.some((filterLabel) => matchesLanguageFilter(p.language, filterLabel))
    );
  }

  // Filter by date range (based on lastUpdated)
  if (filters.dateFrom !== null) {
    const fromDate = new Date(
      filters.dateFrom.year,
      filters.dateFrom.month - 1,
      filters.dateFrom.day
    );
    filtered = filtered.filter((p) => {
      const podcastDate = new Date(p.lastUpdated);
      return podcastDate >= fromDate;
    });
  }
  if (filters.dateTo !== null) {
    const toDate = new Date(
      filters.dateTo.year,
      filters.dateTo.month - 1,
      filters.dateTo.day,
      23,
      59,
      59
    );
    filtered = filtered.filter((p) => {
      const podcastDate = new Date(p.lastUpdated);
      return podcastDate <= toDate;
    });
  }

  // Filter by explicit
  if (filters.explicit !== null) {
    filtered = filtered.filter((p) => p.explicit === filters.explicit);
  }

  // Sort
  switch (filters.sortBy) {
    case 'newest':
      filtered.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      break;
    case 'oldest':
      filtered.sort(
        (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      );
      break;
    case 'popular':
      filtered.sort((a, b) => b.episodeCount - a.episodeCount);
      break;
    // 'relevance' keeps API order
  }

  return filtered;
}

// Map UI filter labels to stored language values
const LANGUAGE_FILTER_MAP: Record<string, string[]> = {
  Norsk: ['Norsk', 'Nynorsk', 'no', 'nb', 'nn'],
  Engelsk: ['English', 'en', 'en-us', 'en-gb'],
  Svensk: ['Svenska', 'sv'],
  Dansk: ['Dansk', 'da'],
};

/**
 * Check if a podcast language matches a UI filter label
 */
function matchesLanguageFilter(podcastLanguage: string, filterLabel: string): boolean {
  const acceptedValues = LANGUAGE_FILTER_MAP[filterLabel];
  if (!acceptedValues) return false;

  const normalizedPodcastLang = podcastLanguage.toLowerCase();
  return acceptedValues.some(
    (val) =>
      normalizedPodcastLang === val.toLowerCase() ||
      normalizedPodcastLang.startsWith(val.toLowerCase())
  );
}

/**
 * Apply local filters to episodes
 */
function applyLocalFiltersToEpisodes(
  episodes: EpisodeWithPodcast[],
  filters: SearchFilters
): EpisodeWithPodcast[] {
  let filtered = [...episodes];

  // Apply exclusion filtering from query (e.g., -word)
  if (filters.query) {
    const parsed = parseSearchQuery(filters.query);
    if (parsed.mustExclude.length > 0) {
      filtered = filtered.filter((ep) => {
        const fullText = normalizeText(`${ep.title} ${ep.description}`);
        for (const term of parsed.mustExclude) {
          if (fullText.includes(normalizeText(term))) return false;
        }
        return true;
      });
    }
  }

  // Filter by languages (using podcast language)
  if (filters.languages.length > 0) {
    filtered = filtered.filter((ep) => {
      if (!ep.podcast || !ep.podcast.language) return false;
      return filters.languages.some((filterLabel) =>
        matchesLanguageFilter(ep.podcast!.language, filterLabel)
      );
    });
  }

  // Filter by date range (based on publishedAt)
  if (filters.dateFrom !== null) {
    const fromDate = new Date(
      filters.dateFrom.year,
      filters.dateFrom.month - 1,
      filters.dateFrom.day
    );
    filtered = filtered.filter((ep) => {
      const episodeDate = new Date(ep.publishedAt);
      return episodeDate >= fromDate;
    });
  }
  if (filters.dateTo !== null) {
    const toDate = new Date(
      filters.dateTo.year,
      filters.dateTo.month - 1,
      filters.dateTo.day,
      23,
      59,
      59
    );
    filtered = filtered.filter((ep) => {
      const episodeDate = new Date(ep.publishedAt);
      return episodeDate <= toDate;
    });
  }

  // Filter by explicit (using podcast explicit flag if available)
  if (filters.explicit !== null) {
    filtered = filtered.filter((ep) =>
      ep.podcast ? ep.podcast.explicit === filters.explicit : true
    );
  }

  return filtered;
}
