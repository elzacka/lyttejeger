import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Podcast, Episode, SearchFilters } from '../types/podcast'

// ============================================================================
// SEARCH QUERY PARSER
// Supports: AND (default), OR, "exact phrase", -exclude
// Examples:
//   "true crime" norge     -> must contain exact "true crime" AND "norge"
//   fotball OR håndball    -> must contain "fotball" OR "håndball"
//   teknologi -krypto      -> must contain "teknologi" but NOT "krypto"
// ============================================================================

export interface ParsedQuery {
  mustInclude: string[]      // AND terms (default)
  exactPhrases: string[]     // "quoted phrases"
  shouldInclude: string[]    // OR terms
  mustExclude: string[]      // -excluded terms
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    mustInclude: [],
    exactPhrases: [],
    shouldInclude: [],
    mustExclude: []
  }

  if (!query.trim()) return result

  // Extract exact phrases (quoted)
  const phraseRegex = /"([^"]+)"/g
  let match
  while ((match = phraseRegex.exec(query)) !== null) {
    result.exactPhrases.push(match[1].toLowerCase())
  }

  // Remove quoted phrases from query for further processing
  let remaining = query.replace(/"[^"]+"/g, ' ')

  // Split by OR operator
  const orParts = remaining.split(/\s+OR\s+/i)

  if (orParts.length > 1) {
    // If OR is used, all terms become shouldInclude
    for (const part of orParts) {
      const terms = part.trim().split(/\s+/).filter(t => t.length > 0)
      for (const term of terms) {
        if (term.startsWith('-') && term.length > 1) {
          result.mustExclude.push(term.slice(1).toLowerCase())
        } else {
          result.shouldInclude.push(term.toLowerCase())
        }
      }
    }
  } else {
    // Default AND behavior
    const terms = remaining.trim().split(/\s+/).filter(t => t.length > 0)
    for (const term of terms) {
      if (term.startsWith('-') && term.length > 1) {
        result.mustExclude.push(term.slice(1).toLowerCase())
      } else if (term.toUpperCase() !== 'AND') {
        result.mustInclude.push(term.toLowerCase())
      }
    }
  }

  return result
}

// ============================================================================
// FUSE.JS CONFIGURATION
// ============================================================================

const podcastFuseOptions: IFuseOptions<Podcast> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'author', weight: 0.25 },
    { name: 'description', weight: 0.2 },
    { name: 'categories', weight: 0.15 }
  ],
  threshold: 0.3,           // Lower = stricter matching
  distance: 100,            // How close match must be to the exact location
  includeScore: true,
  ignoreLocation: true,     // Search entire string
  useExtendedSearch: true,
  findAllMatches: true,
  minMatchCharLength: 2
}

const episodeFuseOptions: IFuseOptions<Episode> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'description', weight: 0.5 }
  ],
  threshold: 0.3,
  distance: 100,
  includeScore: true,
  ignoreLocation: true,
  useExtendedSearch: true,
  findAllMatches: true,
  minMatchCharLength: 2
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
}

function textContains(text: string, term: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedTerm = normalizeText(term)
  return normalizedText.includes(normalizedTerm)
}

function textContainsAll(text: string, terms: string[]): boolean {
  return terms.every(term => textContains(text, term))
}

function textContainsNone(text: string, terms: string[]): boolean {
  return terms.every(term => !textContains(text, term))
}

// ============================================================================
// PODCAST SEARCH
// ============================================================================

export function filterPodcasts(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let results = [...podcasts]

  if (filters.categories.length > 0) {
    results = results.filter(p =>
      p.categories.some(c => filters.categories.includes(c))
    )
  }

  if (filters.languages.length > 0) {
    results = results.filter(p => filters.languages.includes(p.language))
  }

  if (filters.minRating > 0) {
    results = results.filter(p => p.rating >= filters.minRating)
  }

  if (filters.explicit !== null) {
    results = results.filter(p => p.explicit === filters.explicit)
  }

  return results
}

export function searchPodcasts(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let results = filterPodcasts(podcasts, filters)

  if (!filters.query.trim()) {
    // Sort without search query
    switch (filters.sortBy) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        results.sort((a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        )
        break
      case 'popular':
        results.sort((a, b) => b.episodeCount - a.episodeCount)
        break
    }
    return results
  }

  const parsed = parseSearchQuery(filters.query)

  // First, apply exact phrase and exclusion filters
  results = results.filter(podcast => {
    const fullText = `${podcast.title} ${podcast.author} ${podcast.description} ${podcast.categories.join(' ')}`

    // Must contain all exact phrases
    if (!textContainsAll(fullText, parsed.exactPhrases)) {
      return false
    }

    // Must not contain excluded terms
    if (!textContainsNone(fullText, parsed.mustExclude)) {
      return false
    }

    return true
  })

  // Use Fuse.js for fuzzy matching on remaining terms
  const searchTerms = [...parsed.mustInclude, ...parsed.shouldInclude]

  if (searchTerms.length > 0) {
    const fuse = new Fuse(results, podcastFuseOptions)

    if (parsed.shouldInclude.length > 0 && parsed.mustInclude.length === 0) {
      // OR mode: match any term
      const searchPattern = searchTerms.join(' | ')
      const fuseResults = fuse.search(searchPattern)
      results = fuseResults.map(r => r.item)
    } else {
      // AND mode: all terms must match (use intersection)
      let matchedIds = new Set<string>()
      let firstRun = true

      for (const term of parsed.mustInclude) {
        const fuseResults = fuse.search(term)
        const termMatchIds = new Set(fuseResults.map(r => r.item.id))

        if (firstRun) {
          matchedIds = termMatchIds
          firstRun = false
        } else {
          matchedIds = new Set([...matchedIds].filter(id => termMatchIds.has(id)))
        }
      }

      // Get results in order of first search, filtered by intersection
      const fuse2 = new Fuse(results, podcastFuseOptions)
      const allResults = fuse2.search(parsed.mustInclude.join(' '))
      results = allResults
        .filter(r => matchedIds.has(r.item.id))
        .map(r => r.item)
    }
  }

  return results
}

// ============================================================================
// EPISODE SEARCH
// ============================================================================

export interface EpisodeWithPodcast extends Episode {
  podcast?: Podcast
}

export function searchEpisodes(
  episodes: Episode[],
  podcasts: Podcast[],
  query: string
): EpisodeWithPodcast[] {
  if (!query.trim()) {
    // Return recent episodes with podcast info
    return episodes
      .map(ep => ({
        ...ep,
        podcast: podcasts.find(p => p.id === ep.podcastId)
      }))
      .sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 20)
  }

  const parsed = parseSearchQuery(query)

  // Filter by exact phrases and exclusions first
  let results = episodes.filter(episode => {
    const fullText = `${episode.title} ${episode.description}`

    if (!textContainsAll(fullText, parsed.exactPhrases)) {
      return false
    }

    if (!textContainsNone(fullText, parsed.mustExclude)) {
      return false
    }

    return true
  })

  const searchTerms = [...parsed.mustInclude, ...parsed.shouldInclude]

  if (searchTerms.length > 0) {
    const fuse = new Fuse(results, episodeFuseOptions)

    if (parsed.shouldInclude.length > 0 && parsed.mustInclude.length === 0) {
      // OR mode
      const searchPattern = searchTerms.join(' | ')
      const fuseResults = fuse.search(searchPattern)
      results = fuseResults.map(r => r.item)
    } else {
      // AND mode
      let matchedIds = new Set<string>()
      let firstRun = true

      for (const term of parsed.mustInclude) {
        const fuseResults = fuse.search(term)
        const termMatchIds = new Set(fuseResults.map(r => r.item.id))

        if (firstRun) {
          matchedIds = termMatchIds
          firstRun = false
        } else {
          matchedIds = new Set([...matchedIds].filter(id => termMatchIds.has(id)))
        }
      }

      const fuse2 = new Fuse(results, episodeFuseOptions)
      const allResults = fuse2.search(parsed.mustInclude.join(' '))
      results = allResults
        .filter(r => matchedIds.has(r.item.id))
        .map(r => r.item)
    }
  }

  // Add podcast info to results
  return results.map(ep => ({
    ...ep,
    podcast: podcasts.find(p => p.id === ep.podcastId)
  }))
}

// ============================================================================
// COMBINED SEARCH RESULTS
// ============================================================================

export interface SearchResults {
  podcasts: Podcast[]
  episodes: EpisodeWithPodcast[]
}

export function searchAll(
  podcasts: Podcast[],
  episodes: Episode[],
  filters: SearchFilters
): SearchResults {
  return {
    podcasts: searchPodcasts(podcasts, filters),
    episodes: searchEpisodes(episodes, podcasts, filters.query)
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}t ${minutes}m`
  }
  return `${minutes} min`
}
