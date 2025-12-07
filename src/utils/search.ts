import type { Podcast, Episode } from '../types/podcast'

// ============================================================================
// SEARCH QUERY PARSER
// Supports: AND (default), OR, "exact phrase", -exclude
// Examples:
//   "true crime" norge     -> must contain exact "true crime" AND "norge"
//   fotball OR håndball    -> must contain "fotball" OR "håndball"
//   teknologi -krypto      -> must contain "teknologi" but NOT "krypto"
// ============================================================================

export interface ParsedQuery {
  mustInclude: string[]
  exactPhrases: string[]
  shouldInclude: string[]
  mustExclude: string[]
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
  const remaining = query.replace(/"[^"]+"/g, ' ')

  // Split by OR operator
  const orParts = remaining.split(/\s+OR\s+/i)

  const processTerms = (terms: string[], isOr: boolean) => {
    for (const term of terms) {
      if (term.startsWith('-') && term.length > 1) {
        result.mustExclude.push(term.slice(1).toLowerCase())
      } else if (isOr) {
        result.shouldInclude.push(term.toLowerCase())
      } else if (term.toUpperCase() !== 'AND') {
        result.mustInclude.push(term.toLowerCase())
      }
    }
  }

  if (orParts.length > 1) {
    for (const part of orParts) {
      const terms = part.trim().split(/\s+/).filter(t => t.length > 0)
      processTerms(terms, true)
    }
  } else {
    const terms = remaining.trim().split(/\s+/).filter(t => t.length > 0)
    processTerms(terms, false)
  }

  return result
}

// ============================================================================
// TYPES
// ============================================================================

export interface EpisodeWithPodcast extends Episode {
  podcast?: Podcast
}

// ============================================================================
// FORMAT UTILITIES
// ============================================================================

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) {
    return ''
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}t ${minutes}m`
  }
  return `${minutes} min`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return 'I dag'
  if (diffDays === 1) return 'I går'
  if (diffDays < 7) return `${diffDays} dager siden`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined
  })
}

export function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
