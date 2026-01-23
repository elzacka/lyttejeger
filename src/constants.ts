// Application constants

// Time intervals (in milliseconds)
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Feature-specific constants
export const RECENT_EPISODES_DAYS = 7;
export const RECENT_EPISODES_MS = RECENT_EPISODES_DAYS * MS_PER_DAY;

// API and fetching
export const MAX_EPISODES_PER_REQUEST = 100;
export const MAX_PODCASTS_PER_REQUEST = 100;

// UI constants
export const DESCRIPTION_TRUNCATE_LENGTH = 120;
export const DRAG_THRESHOLD_PX = 100;
export const ESTIMATED_LIST_ITEM_HEIGHT_PX = 100;

// Swipe gesture threshold (px) - used in QueueView and SubscriptionsView
export const SWIPE_THRESHOLD_PX = 80;

// Virtualization threshold - use virtual scrolling for lists with this many items or more
export const VIRTUALIZATION_MIN_ITEMS = 20;

// Sort options for list views
export type SortBy = 'relevance' | 'newest' | 'oldest' | 'popular';

export const SORT_LABELS: Record<SortBy, string> = {
  relevance: 'Relevans',
  newest: 'Nyeste',
  oldest: 'Eldste',
  popular: 'Populære',
};

// Audio player
export const PLAYBACK_SAVE_INTERVAL_MS = 5 * MS_PER_SECOND;
export const PLAYBACK_UPDATE_INTERVAL_MS = MS_PER_SECOND;
