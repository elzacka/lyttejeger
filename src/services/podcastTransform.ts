/**
 * Transform Podcast Index API responses to app types
 */
import type { Podcast, Episode } from '../types/podcast'
import type { PodcastIndexFeed, PodcastIndexEpisode } from './podcastIndex'

/**
 * Safely convert unix timestamp to ISO string
 */
function safeTimestampToISO(timestamp: number | undefined | null): string {
  if (!timestamp || timestamp <= 0) {
    return new Date().toISOString() // Default to now
  }
  const date = new Date(timestamp * 1000)
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return new Date().toISOString()
  }
  return date.toISOString()
}

/**
 * Transform API feed to Podcast type
 */
export function transformFeed(feed: PodcastIndexFeed): Podcast {
  return {
    id: feed.id.toString(),
    title: feed.title || 'Untitled',
    author: feed.author || feed.ownerName || 'Unknown',
    description: stripHtml(feed.description || ''),
    imageUrl: feed.artwork || feed.image || '/placeholder-podcast.svg',
    feedUrl: feed.url || feed.originalUrl,
    categories: Object.values(feed.categories || {}),
    language: normalizeLanguage(feed.language),
    episodeCount: feed.episodeCount || 0,
    lastUpdated: safeTimestampToISO(feed.lastUpdateTime),
    rating: calculateRating(feed),
    explicit: feed.explicit || false
  }
}

/**
 * Transform API episode to Episode type
 */
export function transformEpisode(episode: PodcastIndexEpisode): Episode {
  return {
    id: episode.id.toString(),
    podcastId: episode.feedId.toString(),
    title: episode.title || 'Untitled Episode',
    description: stripHtml(episode.description || ''),
    audioUrl: episode.enclosureUrl,
    duration: episode.duration || 0,
    publishedAt: safeTimestampToISO(episode.datePublished),
    imageUrl: episode.image || episode.feedImage || undefined,
    transcriptUrl: episode.transcriptUrl || undefined,
    chaptersUrl: episode.chaptersUrl || undefined,
  }
}

/**
 * Transform multiple feeds
 */
export function transformFeeds(feeds: PodcastIndexFeed[]): Podcast[] {
  return feeds
    .filter(feed => !feed.dead) // Filter out dead feeds
    .map(transformFeed)
}

/**
 * Transform multiple episodes
 */
export function transformEpisodes(episodes: PodcastIndexEpisode[]): Episode[] {
  return episodes.map(ep => transformEpisode(ep))
}

/**
 * Normalize language codes to display format
 */
function normalizeLanguage(lang: string): string {
  if (!lang) return 'Unknown'

  const langMap: Record<string, string> = {
    'no': 'Norsk',
    'nb': 'Norsk',
    'nn': 'Nynorsk',
    'en': 'English',
    'en-us': 'English',
    'en-gb': 'English',
    'sv': 'Svenska',
    'da': 'Dansk',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'fi': 'Suomi',
    'is': 'Íslenska'
  }

  const normalized = lang.toLowerCase().split('-')[0]
  return langMap[lang.toLowerCase()] || langMap[normalized] || lang.toUpperCase()
}

/**
 * Calculate a rating based on feed metrics
 * (Podcast Index doesn't provide ratings, so we estimate based on activity)
 */
function calculateRating(feed: PodcastIndexFeed): number {
  let score = 3.0 // Base score

  // Boost for episode count
  if (feed.episodeCount > 100) score += 0.5
  else if (feed.episodeCount > 50) score += 0.3
  else if (feed.episodeCount > 20) score += 0.1

  // Boost for recent updates
  const daysSinceUpdate = (Date.now() / 1000 - feed.lastUpdateTime) / 86400
  if (daysSinceUpdate < 7) score += 0.5
  else if (daysSinceUpdate < 30) score += 0.3
  else if (daysSinceUpdate < 90) score += 0.1

  // Penalty for errors
  if (feed.crawlErrors > 0 || feed.parseErrors > 0) score -= 0.3

  // Clamp between 1 and 5
  return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}
