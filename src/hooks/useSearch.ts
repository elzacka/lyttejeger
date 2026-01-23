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
import { FEATURES } from '../config/features';

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

  // Modern AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);
    setSearchWarning(null);

    try {
      // Parse query to extract only positive terms for API
      // (exclusions like -word are handled client-side)
      const parsed = parseSearchQuery(query);

      // Only send complete words (2+ chars) to API - partial words won't match
      // Filter out short terms that would cause API to return no results
      // Note: API doesn't support exact phrase with quotes, so send without them
      const completeTerms = [
        ...parsed.mustInclude.filter((t) => t.length >= 2),
        ...parsed.shouldInclude.filter((t) => t.length >= 2),
        ...parsed.exactPhrases, // Without quotes - API ignores them anyway
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

      // Check if category filter is active - API lang filter doesn't work well with cat
      const hasCategory = filters.categories.length > 0;

      // Build search options based on current filters
      // NOTE: Don't send lang to API when cat is set - Podcast Index API ignores lang
      // when cat is specified. Language filtering is done client-side instead.
      const searchOptions: SearchOptions = {
        max: hasCategory ? 400 : 200, // Fetch more when filtering client-side
        fulltext: true, // Get full descriptions
        clean: filters.explicit === false ? true : undefined, // Only filter explicit if user chose "family-friendly"
        lang: hasCategory
          ? undefined
          : getApiLanguageCodes(filters.languages) || ALLOWED_LANGUAGES_API,
      };

      // Add category filter if selected
      if (hasCategory) {
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

      if (signal.aborted) return;

      // Broader term search for completeness
      const podcastIndexRes = await apiSearchPodcasts(apiQuery, searchOptions);
      for (const feed of podcastIndexRes.feeds || []) {
        if (!seenIds.has(feed.id)) {
          seenIds.add(feed.id);
          allFeeds.push(feed);
        }
      }

      if (signal.aborted) return;

      // Transform and filter: remove dead feeds, then apply language and category filters
      let podcasts = transformFeeds(allFeeds);

      // Apply language filter
      if (filters.languages.length > 0) {
        // User selected specific languages - use those
        podcasts = podcasts.filter((p) =>
          filters.languages.some((filterLabel) => matchesLanguageFilter(p.language, filterLabel))
        );
      } else {
        // No user filter - use default allowed languages
        podcasts = podcasts.filter((p) => isAllowedLanguage(p.language));
      }

      // Apply category filter (API ignores cat param when q is set, so filter client-side)
      if (hasCategory) {
        podcasts = podcasts.filter((p) =>
          p.categories.some((podcastCat) =>
            filters.categories.some(
              (filterCat) =>
                podcastCat.toLowerCase() === filterCat.toLowerCase() ||
                podcastCat.toLowerCase().includes(filterCat.toLowerCase()) ||
                filterCat.toLowerCase().includes(podcastCat.toLowerCase())
            )
          )
        );
      }

      // Apply exact phrase filter (API doesn't support quoted phrases)
      if (parsed.exactPhrases.length > 0) {
        podcasts = podcasts.filter((p) => {
          const text = `${p.title} ${p.author} ${p.description}`.toLowerCase();
          return parsed.exactPhrases.every((phrase) => text.includes(phrase.toLowerCase()));
        });
      }

      // Apply title boost if enabled
      if (FEATURES.TITLE_BOOST) {
        podcasts = boostTitleMatches(podcasts, apiQuery);
      }

      // Apply freshness signal if enabled
      if (FEATURES.FRESHNESS_SIGNAL) {
        podcasts = applyFreshnessSignal(podcasts);
      }

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
          // Send query without quotes - API doesn't support exact phrase
          const apiQueryForEpisodes = [
            ...parsed.mustInclude.filter((t) => t.length >= 2),
            ...parsed.shouldInclude.filter((t) => t.length >= 2),
            ...parsed.exactPhrases, // Without quotes for API
          ].join(' ');

          const episodesRes = await searchEpisodesByPerson(apiQueryForEpisodes, {
            max: 50,
            fulltext: true,
          });

          if (signal.aborted) {
            return;
          }

          const episodes = transformEpisodes(episodesRes.items || []);

          for (let idx = 0; idx < episodes.length; idx++) {
            const ep = episodes[idx];
            const apiEp = episodesRes.items?.[idx];

            // Skip if already have this episode
            if (existingIds.has(ep.id)) continue;

            // Check exact phrase match (API doesn't support this)
            if (parsed.exactPhrases.length > 0) {
              const text = `${ep.title} ${ep.description}`.toLowerCase();
              const matchesPhrase = parsed.exactPhrases.every((phrase) =>
                text.includes(phrase.toLowerCase())
              );
              if (!matchesPhrase) continue;
            }

            // Check language filter
            const epLang = apiEp?.feedLanguage || '';
            if (filters.languages.length > 0) {
              // User selected specific languages - use those
              const matchesUserLang = filters.languages.some((filterLabel) =>
                matchesLanguageFilter(epLang, filterLabel)
              );
              if (!matchesUserLang) continue;
            } else {
              // No user filter - use default allowed languages
              if (!isAllowedLanguage(epLang)) continue;
            }

            allEpisodes.push({
              ...ep,
              podcastTitle: apiEp?.feedTitle || '',
              podcastAuthor: apiEp?.feedAuthor || '',
              podcastImage: apiEp?.feedImage || '',
              feedLanguage: epLang,
            } as Episode);
            existingIds.add(ep.id);
          }
        } catch {
          strategy1Failed = true;
          // Continue to strategy 2
        }

        // Strategy 2: Fetch episodes from matching podcasts using batch API
        if (podcasts.length > 0) {
          // Expand coverage: fetch from more podcasts when feature enabled
          const podcastLimit = FEATURES.EXPANDED_EPISODE_SEARCH ? 50 : 20;
          const topPodcasts = podcasts.slice(0, podcastLimit);
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
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // Only show error if this is still the current search
      if (!signal.aborted) {
        setError('Søket feilet. Prøv igjen.');
      }
    } finally {
      // Only stop loading if this is still the current search
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  // Browse by filters only (no search query) - fetches trending/recent content
  const browseByFilters = async (browseType: 'podcasts' | 'episodes') => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    try {
      if (browseType === 'podcasts') {
        const hasCategory = filters.categories.length > 0;
        const hasLanguage = filters.languages.length > 0;

        let podcasts: Podcast[] = [];

        // Strategy depends on filter combination:
        // - Category + Language: Use search API with language, filter category client-side
        //   (Trending API returns almost no non-English podcasts for most categories)
        // - Category only: Use trending API with category
        // - Language only: Use trending API with language
        // - Neither: Use trending API
        if (hasCategory && hasLanguage) {
          // Search with language filter, then filter by category client-side
          // Use category name as search term to get relevant podcasts
          const categorySearchTerms = filters.categories
            .map((cat) => getCategorySearchTerm(cat))
            .join(' OR ');

          const searchRes = await apiSearchPodcasts(categorySearchTerms, {
            max: 200,
            lang: getApiLanguageCodes(filters.languages),
            val: filters.discoveryMode === 'value4value' ? 'any' : undefined,
          });

          if (signal.aborted) return;

          podcasts = transformFeeds(searchRes.feeds);

          // Filter by category on client-side (check if podcast has any of selected categories)
          podcasts = podcasts.filter((p) =>
            p.categories.some((podcastCat) =>
              filters.categories.some(
                (filterCat) =>
                  podcastCat.toLowerCase().includes(filterCat.toLowerCase()) ||
                  filterCat.toLowerCase().includes(podcastCat.toLowerCase())
              )
            )
          );

          // Apply language filter client-side too (API might not filter perfectly)
          podcasts = podcasts.filter((p) =>
            filters.languages.some((filterLabel) => matchesLanguageFilter(p.language, filterLabel))
          );
        } else {
          // Use trending API for other combinations
          const trendingRes = await getTrendingPodcasts({
            max: hasCategory ? 200 : 100,
            cat: hasCategory ? filters.categories.join(',') : undefined,
            notcat:
              filters.excludeCategories.length > 0
                ? filters.excludeCategories.join(',')
                : undefined,
            lang: hasCategory ? undefined : getApiLanguageCodes(filters.languages),
            val: filters.discoveryMode === 'value4value' ? 'any' : undefined,
          });

          if (signal.aborted) return;

          podcasts = transformFeeds(trendingRes.feeds);

          // Apply language filter: user's selection or default allowed languages
          if (hasLanguage) {
            podcasts = podcasts.filter((p) =>
              filters.languages.some((filterLabel) =>
                matchesLanguageFilter(p.language, filterLabel)
              )
            );
          } else {
            podcasts = podcasts.filter((p) => isAllowedLanguage(p.language));
          }
        }

        // Filter for indie podcasts (no iTunes ID) if discovery mode is 'indie'
        if (filters.discoveryMode === 'indie') {
          podcasts = podcasts.filter((p) => !p.itunesId);
        }

        lastSearchQueryRef.current = '';
        lastSearchResultsRef.current = podcasts;
        setApiPodcasts(podcasts);
        setApiEpisodes([]);
      } else {
        // For episodes with category/discovery/date filter, we need to:
        // 1. Get podcasts in the selected categories
        // 2. Fetch episodes from those podcasts
        // The /recent/episodes endpoint doesn't support category or date filtering
        const needsAdvancedEpisodeFetch =
          filters.categories.length > 0 ||
          filters.discoveryMode !== 'all' ||
          filters.dateFrom !== null;

        if (needsAdvancedEpisodeFetch) {
          const hasCategory = filters.categories.length > 0;
          const hasLanguage = filters.languages.length > 0;

          let podcasts: Podcast[] = [];

          // Same strategy as podcast browsing: use search API for category+language
          if (hasCategory && hasLanguage) {
            const categorySearchTerms = filters.categories
              .map((cat) => getCategorySearchTerm(cat))
              .join(' OR ');

            const searchRes = await apiSearchPodcasts(categorySearchTerms, {
              max: 100,
              lang: getApiLanguageCodes(filters.languages),
              val: filters.discoveryMode === 'value4value' ? 'any' : undefined,
            });

            if (signal.aborted) return;

            podcasts = transformFeeds(searchRes.feeds);

            // Filter by category on client-side
            podcasts = podcasts.filter((p) =>
              p.categories.some((podcastCat) =>
                filters.categories.some(
                  (filterCat) =>
                    podcastCat.toLowerCase().includes(filterCat.toLowerCase()) ||
                    filterCat.toLowerCase().includes(podcastCat.toLowerCase())
                )
              )
            );

            // Apply language filter client-side too
            podcasts = podcasts.filter((p) =>
              filters.languages.some((filterLabel) =>
                matchesLanguageFilter(p.language, filterLabel)
              )
            );
          } else {
            // Use trending API for other combinations
            const trendingRes = await getTrendingPodcasts({
              max: hasCategory ? 100 : 30,
              cat: hasCategory ? filters.categories.join(',') : undefined,
              notcat:
                filters.excludeCategories.length > 0
                  ? filters.excludeCategories.join(',')
                  : undefined,
              lang: hasCategory ? undefined : getApiLanguageCodes(filters.languages),
              val: filters.discoveryMode === 'value4value' ? 'any' : undefined,
            });

            if (signal.aborted) return;

            podcasts = transformFeeds(trendingRes.feeds);

            // Apply language filter: user's selection or default allowed languages
            if (hasLanguage) {
              podcasts = podcasts.filter((p) =>
                filters.languages.some((filterLabel) =>
                  matchesLanguageFilter(p.language, filterLabel)
                )
              );
            } else {
              podcasts = podcasts.filter((p) => isAllowedLanguage(p.language));
            }
          }

          // Filter for indie podcasts (no iTunes ID) if discovery mode is 'indie'
          if (filters.discoveryMode === 'indie') {
            podcasts = podcasts.filter((p) => !p.itunesId);
          }

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
          const podcastLimit = FEATURES.EXPANDED_EPISODE_SEARCH ? 50 : 20;
          const topPodcasts = podcasts.slice(0, podcastLimit);
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
          // No category/discovery/date filter - fetch recent episodes
          const recentRes = await getRecentEpisodes({
            max: 100,
            fulltext: true,
            lang: getApiLanguageCodes(filters.languages),
          });

          if (signal.aborted) return;

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
            .filter((ep) => {
              // If user selected specific languages, filter by those
              if (filters.languages.length > 0) {
                return filters.languages.some((filterLabel) =>
                  matchesLanguageFilter(ep.feedLanguage, filterLabel)
                );
              }
              // Otherwise, use default allowed languages
              return isAllowedLanguage(ep.feedLanguage);
            });

          setApiPodcasts([]);
          setApiEpisodes(episodesWithMeta as Episode[]);
        }
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (!signal.aborted) {
        setError('Kunne ikke hente innhold. Prøv igjen.');
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  // Track filters for re-triggering API search
  const filtersRef = useRef({
    languages: filters.languages,
    categories: filters.categories,
    discoveryMode: filters.discoveryMode,
    dateFrom: filters.dateFrom,
  });

  // Check if any browse-relevant filters are active
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.languages.length > 0 ||
    filters.dateFrom !== null ||
    filters.discoveryMode !== 'all';

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
    // Intentionally omit searchViaApi and browseByFilters - they are stable callbacks
    // and including them would cause unnecessary re-renders on every filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.dateFrom, shouldUseApi, clearResults, activeTab, hasActiveFilters]);

  // Re-search when tab changes (if we have a query)
  useEffect(() => {
    if (!shouldUseApi || filters.query.length < 2) return;
    // Don't search when switching to queue or subscriptions tab
    if (activeTab === 'queue' || activeTab === 'subscriptions') return;

    // Trigger new search with current query for the new tab
    searchViaApi(filters.query, activeTab);
    // Only re-search when tab changes - query changes are handled by the main effect above
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
    const dateFromChanged = filtersRef.current.dateFrom?.year !== filters.dateFrom?.year;
    const filtersChanged =
      languagesChanged || categoriesChanged || discoveryModeChanged || dateFromChanged;

    if (filtersChanged) {
      filtersRef.current = {
        languages: filters.languages,
        categories: filters.categories,
        discoveryMode: filters.discoveryMode,
        dateFrom: filters.dateFrom,
      };
      // Re-trigger API search with updated filters
      const searchTab = activeTab === 'episodes' ? 'episodes' : 'podcasts';
      const timer = setTimeout(() => {
        searchViaApi(filters.query, searchTab);
      }, 200);
      return () => clearTimeout(timer);
    }
    // Uses refs to compare filter changes - including searchViaApi would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.languages,
    filters.categories,
    filters.discoveryMode,
    filters.dateFrom,
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

  // Cleanup on unmount - abort any in-flight requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
 * Boost podcasts where query matches title more closely
 * Priority: exact match > starts with > contains > other
 */
function boostTitleMatches(podcasts: Podcast[], query: string): Podcast[] {
  if (!query.trim()) return podcasts;

  const queryNorm = normalizeText(query);

  return [...podcasts].sort((a, b) => {
    const aTitle = normalizeText(a.title);
    const bTitle = normalizeText(b.title);

    // Score: 3 = exact, 2 = starts with, 1 = contains, 0 = other
    const scoreA =
      aTitle === queryNorm
        ? 3
        : aTitle.startsWith(queryNorm)
          ? 2
          : aTitle.includes(queryNorm)
            ? 1
            : 0;
    const scoreB =
      bTitle === queryNorm
        ? 3
        : bTitle.startsWith(queryNorm)
          ? 2
          : bTitle.includes(queryNorm)
            ? 1
            : 0;

    // Higher score first, preserve order for equal scores
    return scoreB - scoreA;
  });
}

/**
 * Apply freshness signal to podcast ranking
 * Boosts recently updated podcasts, penalizes stale ones
 */
function applyFreshnessSignal(podcasts: Podcast[]): Podcast[] {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return [...podcasts].sort((a, b) => {
    const aUpdated = new Date(a.lastUpdated).getTime();
    const bUpdated = new Date(b.lastUpdated).getTime();
    const aDays = (now - aUpdated) / DAY_MS;
    const bDays = (now - bUpdated) / DAY_MS;

    // Score: 2 = <30 days, 1 = 30-180 days, 0 = 180-365 days, -1 = >365 days
    const getScore = (days: number) => {
      if (days < 30) return 2;
      if (days < 180) return 1;
      if (days < 365) return 0;
      return -1;
    };

    const scoreA = getScore(aDays);
    const scoreB = getScore(bDays);

    // Only reorder if scores differ significantly
    return scoreB - scoreA;
  });
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
// Note: Norwegian podcasts use various codes: 'no', 'nb' (bokmål), 'nn' (nynorsk)
const LANGUAGE_FILTER_MAP: Record<string, string[]> = {
  Norsk: ['Norsk', 'Nynorsk', 'no', 'nb', 'nn', 'no-no', 'nb-no', 'nn-no'],
  Engelsk: ['English', 'en', 'en-us', 'en-gb', 'en-au', 'en-ca'],
  Svensk: ['Svenska', 'sv', 'sv-se'],
  Dansk: ['Dansk', 'da', 'da-dk'],
};

// Map UI filter labels to API language codes
const LANGUAGE_TO_API_CODE: Record<string, string> = {
  Norsk: 'no',
  Engelsk: 'en',
  Svensk: 'sv',
  Dansk: 'da',
};

/**
 * Convert UI language labels to API codes for the lang parameter
 */
function getApiLanguageCodes(filterLabels: string[]): string | undefined {
  if (filterLabels.length === 0) return undefined;
  const codes = filterLabels.map((label) => LANGUAGE_TO_API_CODE[label]).filter(Boolean);
  return codes.length > 0 ? codes.join(',') : undefined;
}

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
 * Convert category name to search terms for finding podcasts in that category
 * Maps UI category names to Nordic (NO/SV/DA) and English search terms
 */
function getCategorySearchTerm(category: string): string {
  const categoryTerms: Record<string, string> = {
    // Map English category names to Norwegian, Swedish, Danish, and English terms
    Technology: 'teknologi OR technology OR teknik OR tech OR IT',
    Business: 'business OR næringsliv OR økonomi OR ekonomi OR erhverv OR företag',
    News: 'nyheter OR news OR aktuelt OR nyheder OR podcast',
    'Society & Culture': 'samfunn OR kultur OR society OR culture OR samhälle',
    Education: 'utdanning OR education OR læring OR uddannelse OR utbildning',
    'Health & Fitness': 'helse OR health OR trening OR fitness OR hälsa OR sundhed',
    Arts: 'kunst OR art OR kultur OR konst',
    Comedy: 'humor OR comedy OR komedie OR komedi',
    Sports: 'sport OR idrett OR fotball OR fodbold OR idrott',
    Music: 'musikk OR music OR musik',
    Science: 'vitenskap OR science OR forskning OR vetenskap OR videnskab',
    'True Crime': 'krim OR true crime OR mord OR krimi OR brott',
    History: 'historie OR history OR historia',
    Religion: 'religion OR tro OR spiritualitet OR andlighet',
    Kids: 'barn OR kids OR familie OR familj OR børn',
    Fiction: 'fiksjon OR fiction OR drama OR berättelse',
    Government: 'politikk OR government OR offentlig OR politik OR regering',
    Leisure: 'fritid OR hobby OR leisure OR hobbyer',
    TV: 'tv OR film OR serie OR serier',
  };

  return categoryTerms[category] || category.toLowerCase();
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
