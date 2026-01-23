/**
 * Fetch and parse Podcasting 2.0 chapters
 * @see https://github.com/Podcastindex-org/podcast-namespace/blob/main/chapters/jsonChapters.md
 */

import type { Chapter } from '../types/podcast';

// Cache for chapter data
const chapterCache = new Map<string, { chapters: Chapter[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface ChaptersResponse {
  version: string;
  chapters: Array<{
    startTime: number;
    title?: string;
    img?: string;
    url?: string;
    toc?: boolean;
    endTime?: number;
  }>;
}

/**
 * Fetch chapters from a chapters URL
 * Returns empty array if fetch fails or no chapters found
 */
export async function fetchChapters(chaptersUrl: string): Promise<Chapter[]> {
  if (!chaptersUrl) return [];

  // Check cache
  const cached = chapterCache.get(chaptersUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.chapters;
  }

  try {
    const response = await fetch(chaptersUrl);
    if (!response.ok) {
      return [];
    }

    const data: ChaptersResponse = await response.json();

    if (!data.chapters || !Array.isArray(data.chapters)) {
      return [];
    }

    // Transform and filter chapters
    const chapters: Chapter[] = data.chapters
      .filter((ch) => typeof ch.startTime === 'number' && ch.title)
      .map((ch) => ({
        startTime: ch.startTime,
        title: ch.title || 'Untitled',
        img: ch.img,
        url: ch.url,
        toc: ch.toc,
        endTime: ch.endTime,
      }))
      .sort((a, b) => a.startTime - b.startTime);

    // Cache result
    chapterCache.set(chaptersUrl, { chapters, timestamp: Date.now() });

    return chapters;
  } catch {
    return [];
  }
}

/**
 * Format time in seconds to mm:ss or hh:mm:ss
 */
export function formatChapterTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Find the current chapter based on playback position
 */
export function getCurrentChapter(chapters: Chapter[], currentTime: number): Chapter | null {
  if (chapters.length === 0) return null;

  // Find the last chapter that started before or at current time
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (chapters[i].startTime <= currentTime) {
      return chapters[i];
    }
  }

  return null;
}
