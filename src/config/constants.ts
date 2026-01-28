/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** How long to wait before considering a press as long-press (ms) */
export const LONG_PRESS_DELAY_MS = 500;

/** Swipe threshold in pixels to trigger action */
export const SWIPE_THRESHOLD_PX = 50;

/** Pull-to-refresh trigger threshold (px) */
export const PULL_REFRESH_THRESHOLD_PX = 80;

/** Animation duration for sheet transitions (ms) */
export const SHEET_ANIMATION_MS = 200;

/** Playback position save interval (ms) */
export const PLAYBACK_SAVE_INTERVAL_MS = 5000;

// =============================================================================
// CACHE CONSTANTS
// =============================================================================

/** API response cache TTL (ms) - per Podcast Index ToS */
export const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Chapter cache TTL (ms) */
export const CHAPTER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Maximum cache entries for API responses */
export const API_CACHE_MAX_SIZE = 100;

/** Maximum cache entries for chapters */
export const CHAPTER_CACHE_MAX_SIZE = 50;

// =============================================================================
// RATE LIMITING
// =============================================================================

/** Minimum interval between Podcast Index API requests (ms) */
export const PODCAST_INDEX_RATE_LIMIT_MS = 1000;

/** Maximum retry attempts for API requests */
export const API_MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
export const API_RETRY_BASE_DELAY_MS = 1000;

// =============================================================================
// AUDIO PLAYBACK
// =============================================================================

/** Skip backward duration (seconds) */
export const SKIP_BACKWARD_SECONDS = 10;

/** Skip forward duration (seconds) */
export const SKIP_FORWARD_SECONDS = 30;

/** Available playback speeds */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Sleep timer options (minutes, -1 = end of episode, 0 = off) */
export const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'Av' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 time' },
  { value: -1, label: 'Slutten' },
] as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================

/** Episodes per page for pagination */
export const EPISODES_PER_PAGE = 100;

/** Minimum items for virtualization to kick in */
export const VIRTUALIZATION_MIN_ITEMS = 15;

/** Estimated episode card height for virtualization (px) */
export const ESTIMATED_EPISODE_HEIGHT_PX = 110;

/** Maximum description length before truncation */
export const MAX_DESCRIPTION_LENGTH = 300;

/** Menu dropdown offset from button (px) */
export const MENU_DROPDOWN_OFFSET_PX = 4;

// =============================================================================
// STORAGE KEYS
// =============================================================================

/** LocalStorage key for playback speed preference */
export const STORAGE_KEY_PLAYBACK_SPEED = 'lyttejeger-playback-speed';

/** LocalStorage key for dark mode preference */
export const STORAGE_KEY_DARK_MODE = 'lyttejeger-dark-mode';

// =============================================================================
// DEVICE DETECTION
// =============================================================================

/** iOS Safari user agent patterns */
export const IOS_SAFARI_PATTERNS = [
  /iPad|iPhone|iPod/.test(navigator.userAgent),
  !('MSStream' in window),
] as const;

/** Minimum screen width for tablet layout (px) */
export const TABLET_MIN_WIDTH_PX = 768;

/** Minimum screen width for desktop layout (px) */
export const DESKTOP_MIN_WIDTH_PX = 1024;
