/**
 * Transcript panel for AudioPlayer
 * Displays podcast transcript with seek-to functionality
 */

import { useMemo } from 'react';
import { formatTranscriptTime, getCurrentSegment, type Transcript } from '../../services/transcripts';
import styles from '../AudioPlayer.module.css';

interface TranscriptPanelProps {
  transcript: Transcript;
  currentTime: number;
  onSeekToSegment: (startTime: number) => void;
}

export function TranscriptPanel({ transcript, currentTime, onSeekToSegment }: TranscriptPanelProps) {
  const currentSegment = useMemo(() => {
    return getCurrentSegment(transcript, currentTime);
  }, [transcript, currentTime]);

  if (transcript.segments.length === 0) return null;

  return (
    <div className={styles.transcriptList} role="list" aria-label="Transkripsjon">
      {transcript.segments.map((segment, index) => {
        const isCurrent = currentSegment === segment;
        return (
          <button
            key={`${segment.startTime}-${index}`}
            className={`${styles.transcriptItem} ${isCurrent ? styles.transcriptItemActive : ''}`}
            onClick={() => onSeekToSegment(segment.startTime)}
            role="listitem"
            aria-current={isCurrent ? 'true' : undefined}
          >
            <span className={styles.transcriptTime}>
              {formatTranscriptTime(segment.startTime)}
            </span>
            <span className={styles.transcriptText}>
              {segment.speaker && <strong>{segment.speaker}: </strong>}
              {segment.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}
