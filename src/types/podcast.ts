export interface Podcast {
  id: string;
  /** Podcast GUID - stable identifier that survives feed URL changes */
  guid?: string;
  title: string;
  author: string;
  description: string;
  imageUrl: string;
  feedUrl: string;
  websiteUrl?: string;
  categories: string[];
  language: string;
  episodeCount: number;
  lastUpdated: string;
  rating: number;
  explicit: boolean;
  /** iTunes/Apple Podcasts ID - null for indie podcasts */
  itunesId?: number | null;
}

/**
 * Soundbite from Podcasting 2.0 spec
 * @see https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#soundbite
 */
export interface Soundbite {
  startTime: number;
  duration: number;
  title: string;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number;
  publishedAt: string;
  imageUrl?: string;
  transcriptUrl?: string;
  chaptersUrl?: string;
  /** Season number (from podcast:season tag) */
  season?: number;
  /** Episode number within season (from podcast:episode tag) */
  episode?: number;
  /** Episode type: full, trailer, bonus */
  episodeType?: 'full' | 'trailer' | 'bonus';
  /** Soundbites - highlighted audio clips from the episode */
  soundbites?: Soundbite[];
}

/**
 * Podcasting 2.0 Chapter format
 * @see https://github.com/Podcastindex-org/podcast-namespace/blob/main/chapters/jsonChapters.md
 */
export interface Chapter {
  startTime: number;
  title: string;
  img?: string;
  url?: string;
  toc?: boolean;
  endTime?: number;
}

export interface DateFilter {
  day: number;
  month: number; // 1-12
  year: number;
}

export interface SearchFilters {
  query: string;
  categories: string[];
  excludeCategories: string[];
  languages: string[];
  maxDuration: number | null;
  sortBy: 'relevance' | 'newest' | 'oldest' | 'popular';
  explicit: boolean | null;
  dateFrom: DateFilter | null;
  dateTo: DateFilter | null;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}
