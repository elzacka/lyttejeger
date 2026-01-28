/**
 * Chapter list panel for AudioPlayer
 * Displays podcast chapters with seek-to functionality
 */

import { useMemo } from 'react';
import type { Chapter } from '../../types/podcast';
import { formatChapterTime, getCurrentChapter } from '../../services/chapters';
import styles from '../AudioPlayer.module.css';

interface ChapterPanelProps {
  chapters: Chapter[];
  currentTime: number;
  onSeekToChapter: (chapter: Chapter) => void;
}

export function ChapterPanel({ chapters, currentTime, onSeekToChapter }: ChapterPanelProps) {
  const currentChapter = useMemo(() => {
    return getCurrentChapter(chapters, currentTime);
  }, [chapters, currentTime]);

  if (chapters.length === 0) return null;

  return (
    <div className={styles.chapterList} role="list" aria-label="Kapitler">
      {chapters.map((chapter, index) => {
        const isCurrent = currentChapter === chapter;
        return (
          <button
            key={`${chapter.startTime}-${index}`}
            className={`${styles.chapterItem} ${isCurrent ? styles.chapterItemActive : ''}`}
            onClick={() => onSeekToChapter(chapter)}
            role="listitem"
            aria-current={isCurrent ? 'true' : undefined}
          >
            <span className={styles.chapterTime}>{formatChapterTime(chapter.startTime)}</span>
            <span className={styles.chapterTitle}>{chapter.title}</span>
          </button>
        );
      })}
    </div>
  );
}
