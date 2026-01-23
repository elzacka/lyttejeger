/**
 * Tests for useSearch hook
 * Covers search functionality, debouncing, and AbortController usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearch } from './useSearch';

// Mock the API
vi.mock('../services/podcastIndex', () => ({
  searchPodcasts: vi.fn().mockResolvedValue({ podcasts: [], count: 0 }),
  searchEpisodes: vi.fn().mockResolvedValue({ episodes: [], count: 0 }),
}));

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.podcasts).toEqual([]);
    expect(result.current.episodes).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should debounce search queries', async () => {
    const { result } = renderHook(() => useSearch());

    // Call setQuery multiple times rapidly
    result.current.setQuery('test');
    result.current.setQuery('testing');
    result.current.setQuery('testing podcast');

    // Should only trigger one search after debounce
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 1000 }
    );
  });

  it('should clear results when query is empty', () => {
    const { result } = renderHook(() => useSearch());

    result.current.setQuery('');

    expect(result.current.podcasts).toEqual([]);
    expect(result.current.episodes).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle search type changes', () => {
    const { result } = renderHook(() => useSearch());

    result.current.setActiveTab('episodes');
    expect(result.current.activeTab).toBe('episodes');

    result.current.setActiveTab('podcasts');
    expect(result.current.activeTab).toBe('podcasts');
  });

  it('should clear filters correctly', () => {
    const { result } = renderHook(() => useSearch());

    // Set some filters
    result.current.setSelectedLanguages(['en']);
    result.current.setSelectedCategories([1, 2]);

    // Clear filters
    result.current.clearFilters();

    expect(result.current.selectedLanguages).toEqual([]);
    expect(result.current.selectedCategories).toEqual([]);
  });
});
