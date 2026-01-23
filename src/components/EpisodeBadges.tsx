import { List as ChapterListIcon, FileText as TranscriptIcon } from 'lucide-react';
import { FEATURES } from '../config/features';
import styles from './EpisodeBadges.module.css';

interface EpisodeBadgesProps {
  chaptersUrl?: string;
  transcriptUrl?: string;
  className?: string;
}

/**
 * Reusable badges for episode metadata (chapters, transcripts)
 * Use in any episode list or card to show consistent indicators
 */
export function EpisodeBadges({ chaptersUrl, transcriptUrl, className }: EpisodeBadgesProps) {
  const hasChapters = FEATURES.CHAPTERS && chaptersUrl;
  const hasTranscript = FEATURES.TRANSCRIPTS && transcriptUrl;

  if (!hasChapters && !hasTranscript) return null;

  return (
    <span className={`${styles.badges} ${className ?? ''}`}>
      {hasChapters && (
        <span className={styles.badge} title="Har kapitler">
          <ChapterListIcon size={12} aria-hidden="true" />
        </span>
      )}
      {hasTranscript && (
        <span className={styles.badge} title="Har transkripsjon">
          <TranscriptIcon size={12} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
