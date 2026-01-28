import { useState, useEffect, useRef } from 'react';
import {
  fetchTranscript,
  formatTranscriptTime,
  type Transcript,
  type TranscriptSegment,
} from '../services/transcripts';
import styles from './TranscriptViewer.module.css';

interface TranscriptViewerProps {
  transcriptUrl: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function TranscriptViewer({
  transcriptUrl,
  currentTime = 0,
  onSeek,
}: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const result = await fetchTranscript(transcriptUrl);

      if (result && result.segments.length > 0) {
        setTranscript(result);
      } else {
        setError('Kunne ikke laste transkripsjonen');
      }

      setIsLoading(false);
    };

    load();
  }, [transcriptUrl]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      const isVisible =
        activeRect.top >= containerRect.top && activeRect.bottom <= containerRect.bottom;

      if (!isVisible) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, autoScroll]);

  // Pause auto-scroll on manual scroll
  const handleScroll = () => {
    // Could implement manual scroll detection here
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    onSeek?.(segment.startTime);
  };

  const isActive = (segment: TranscriptSegment) => {
    return currentTime >= segment.startTime && currentTime < segment.endTime;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className={`material-symbols-outlined ${styles.spinner}`} aria-hidden="true">
            progress_activity
          </span>
          <span>Laster transkripsjon...</span>
        </div>
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className="material-symbols-outlined" aria-hidden="true">
            error_outline
          </span>
          <span>{error || 'Ingen transkripsjon tilgjengelig'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <span className="material-symbols-outlined" aria-hidden="true">
            subtitles
          </span>
          Transkripsjon
        </span>
        <button
          className={`${styles.autoScrollToggle} ${autoScroll ? styles.active : ''}`}
          onClick={() => setAutoScroll(!autoScroll)}
          aria-pressed={autoScroll}
          title={autoScroll ? 'Automatisk rulling på' : 'Automatisk rulling av'}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {autoScroll ? 'sync' : 'sync_disabled'}
          </span>
        </button>
      </div>

      <div ref={containerRef} className={styles.segments} onScroll={handleScroll}>
        {transcript.segments.map((segment) => {
          const active = isActive(segment);
          return (
            <button
              key={segment.startTime}
              ref={active ? activeRef : undefined}
              className={`${styles.segment} ${active ? styles.active : ''}`}
              onClick={() => handleSegmentClick(segment)}
              aria-current={active ? 'true' : undefined}
            >
              <span className={styles.time}>{formatTranscriptTime(segment.startTime)}</span>
              <span className={styles.text}>{segment.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
