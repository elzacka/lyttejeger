import type { Podcast, SearchFilters } from '../types/podcast'

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(token => token.length > 1)
}

export function calculateRelevanceScore(podcast: Podcast, query: string): number {
  if (!query.trim()) return 0

  const queryTokens = tokenize(query)
  const titleTokens = tokenize(podcast.title)
  const authorTokens = tokenize(podcast.author)
  const descriptionTokens = tokenize(podcast.description)
  const categoryTokens = podcast.categories.flatMap(c => tokenize(c))

  let score = 0

  for (const queryToken of queryTokens) {
    // Exact title match (highest priority)
    if (titleTokens.includes(queryToken)) {
      score += 100
    }
    // Title starts with query token
    else if (titleTokens.some(t => t.startsWith(queryToken))) {
      score += 80
    }
    // Title contains query token
    else if (titleTokens.some(t => t.includes(queryToken))) {
      score += 60
    }

    // Author match
    if (authorTokens.includes(queryToken)) {
      score += 50
    } else if (authorTokens.some(t => t.includes(queryToken))) {
      score += 30
    }

    // Category match
    if (categoryTokens.includes(queryToken)) {
      score += 40
    } else if (categoryTokens.some(t => t.includes(queryToken))) {
      score += 25
    }

    // Description match (lower priority)
    const descriptionMatches = descriptionTokens.filter(t =>
      t.includes(queryToken) || queryToken.includes(t)
    ).length
    score += Math.min(descriptionMatches * 5, 30)
  }

  return score
}

export function filterPodcasts(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let results = [...podcasts]

  // Apply category filter
  if (filters.categories.length > 0) {
    results = results.filter(p =>
      p.categories.some(c => filters.categories.includes(c))
    )
  }

  // Apply language filter
  if (filters.languages.length > 0) {
    results = results.filter(p => filters.languages.includes(p.language))
  }

  // Apply minimum rating filter
  if (filters.minRating > 0) {
    results = results.filter(p => p.rating >= filters.minRating)
  }

  // Apply explicit content filter
  if (filters.explicit !== null) {
    results = results.filter(p => p.explicit === filters.explicit)
  }

  return results
}

export function searchPodcasts(podcasts: Podcast[], filters: SearchFilters): Podcast[] {
  let results = filterPodcasts(podcasts, filters)

  // Apply search query
  if (filters.query.trim()) {
    results = results.map(podcast => ({
      podcast,
      score: calculateRelevanceScore(podcast, filters.query)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.podcast)
  } else {
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
      default:
        // Keep original order for relevance when no query
        break
    }
  }

  return results
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text

  const queryTokens = tokenize(query)
  let result = text

  for (const token of queryTokens) {
    const regex = new RegExp(`(${token})`, 'gi')
    result = result.replace(regex, '**$1**')
  }

  return result
}

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
