/**
 * Feature flags for gradual rollout of new functionality
 *
 * Set to true to enable, false to disable.
 * These can be toggled without code changes for testing.
 */
export const FEATURES = {
  /**
   * Re-rank search results to boost exact title matches
   * Improves relevance when user searches for specific podcast name
   */
  TITLE_BOOST: true,

  /**
   * Expand episode search from top 20 to top 50 podcasts
   * Increases coverage for episode search results
   */
  EXPANDED_EPISODE_SEARCH: true,

  /**
   * Enable chapter playback in audio player
   * Shows chapter list and enables seeking to chapters
   *
   * Infrastructure ready:
   * - Chapter type defined in types/podcast.ts
   * - Fetch service in services/chapters.ts
   * - ChapterListIcon added to @designsystem/core
   *
   * Status: Complete
   * - Chapter list UI in AudioPlayer
   * - Current chapter indicator (highlighted)
   * - Seek to chapter on tap
   */
  CHAPTERS: true,

  /**
   * Apply freshness signal to search ranking
   * Boosts recently updated podcasts, penalizes stale ones
   */
  FRESHNESS_SIGNAL: true,

  /**
   * Display season and episode numbers in episode cards
   * Shows "S1 E5" style metadata when available from API
   */
  SEASON_EPISODE_METADATA: true,

  /**
   * Enable transcript display in audio player
   * Shows transcript button when episode has transcriptUrl
   */
  TRANSCRIPTS: true,

  /**
   * Store and expose podcast GUID
   * GUIDs are stable identifiers that survive feed URL changes
   * Useful for cross-platform sync and share links
   */
  PODCAST_GUID: true,

  /**
   * Enable soundbite discovery
   * Shows highlighted audio clips in AudioPlayer when episode has soundbites
   */
  SOUNDBITES: true,

  /**
   * Enable live episode indicator
   * Shows "Live" badge on episodes that are currently streaming
   * Also enables fetching live episode status
   */
  LIVE_EPISODES: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
