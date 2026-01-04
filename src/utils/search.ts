import type { Podcast, Episode } from '../types/podcast';

// ============================================================================
// SEARCH QUERY PARSER
// Supports: AND (default), OR, "exact phrase", -exclude
// Examples:
//   "true crime" norge     -> must contain exact "true crime" AND "norge"
//   fotball OR håndball    -> must contain "fotball" OR "håndball"
//   teknologi -krypto      -> must contain "teknologi" but NOT "krypto"
// ============================================================================

export interface ParsedQuery {
  mustInclude: string[];
  exactPhrases: string[];
  shouldInclude: string[];
  mustExclude: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    mustInclude: [],
    exactPhrases: [],
    shouldInclude: [],
    mustExclude: [],
  };

  if (!query.trim()) return result;

  // Extract exact phrases (quoted)
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    result.exactPhrases.push(match[1].toLowerCase());
  }

  // Remove quoted phrases from query for further processing
  const remaining = query.replace(/"[^"]+"/g, ' ');

  // Split by OR operator
  const orParts = remaining.split(/\s+OR\s+/i);

  const processTerms = (terms: string[], isOr: boolean) => {
    for (const term of terms) {
      if (term.startsWith('-') && term.length > 1) {
        result.mustExclude.push(term.slice(1).toLowerCase());
      } else if (isOr) {
        result.shouldInclude.push(term.toLowerCase());
      } else if (term.toUpperCase() !== 'AND') {
        result.mustInclude.push(term.toLowerCase());
      }
    }
  };

  if (orParts.length > 1) {
    for (const part of orParts) {
      const terms = part
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .filter((t) => t.toUpperCase() !== 'AND'); // Filter out AND in OR context
      processTerms(terms, true);
    }
  } else {
    const terms = remaining
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    processTerms(terms, false);
  }

  return result;
}

// ============================================================================
// TYPES
// ============================================================================

export interface EpisodeWithPodcast extends Episode {
  podcast?: Podcast;
}

// ============================================================================
// FORMAT UTILITIES
// ============================================================================

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) {
    return '';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}t ${minutes}m`;
  }
  return `${minutes} min`;
}

export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Same day - show hours ago
  if (diffDays === 0 && diffHours >= 1) {
    return `${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`;
  }
  if (diffDays === 0) return 'Nettopp';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;

  // Same week - show day name
  const dayNames = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
  if (diffDays < 14) {
    return dayNames[date.getDay()];
  }

  // Older - show full date
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

export interface TextPart {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

export function linkifyText(text: string): TextPart[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', content: match[1], url: match[1] });
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

// ============================================================================
// LANGUAGE UTILITIES
// ============================================================================

/** Allowed language codes for filtering (Norwegian, Danish, Swedish, English) */
const ALLOWED_LANG_CODES = ['no', 'nb', 'nn', 'da', 'sv', 'en'];

/**
 * Check if a language code is in the allowed list (Nordic + English)
 * @param lang - Language code (e.g., "en", "en-US", "nb-NO")
 * @param strict - If true, undefined/null returns false. If false, returns true.
 */
export function isAllowedLanguage(
  lang: string | undefined | null,
  strict: boolean = false
): boolean {
  if (!lang) return !strict;
  const normalized = lang.toLowerCase().split(/[-_]/)[0];
  return ALLOWED_LANG_CODES.includes(normalized);
}
