/**
 * Audio player controls - play/pause and skip buttons
 */

import {
  Play as PlayIcon,
  Pause as PauseIcon,
  RotateCcw as RotateCcwIcon,
  RotateCw as RotateCwIcon,
  Loader2 as SpinnerIcon,
  AlertCircle as ErrorIcon,
} from 'lucide-react';
import styles from '../AudioPlayer.module.css';

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  audioError: boolean;
  onTogglePlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  size?: 'small' | 'large';
}

export function AudioPlayerControls({
  isPlaying,
  isLoading,
  audioError,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  size = 'large',
}: AudioPlayerControlsProps) {
  const iconSize = size === 'large' ? 32 : 24;
  const skipIconSize = size === 'large' ? 24 : 20;

  return (
    <div className={styles.controls}>
      <button
        className={styles.skipButton}
        onClick={onSkipBackward}
        aria-label="Spol tilbake 10 sekunder"
        title="Spol tilbake 10 sekunder"
      >
        <RotateCcwIcon size={skipIconSize} />
        <span className={styles.skipLabel}>10</span>
      </button>

      <button
        className={styles.playButton}
        onClick={onTogglePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Spill'}
        disabled={isLoading || audioError}
      >
        {isLoading ? (
          <SpinnerIcon size={iconSize} className={styles.loading} />
        ) : audioError ? (
          <ErrorIcon size={iconSize} />
        ) : isPlaying ? (
          <PauseIcon size={iconSize} />
        ) : (
          <PlayIcon size={iconSize} />
        )}
      </button>

      <button
        className={styles.skipButton}
        onClick={onSkipForward}
        aria-label="Spol fremover 30 sekunder"
        title="Spol fremover 30 sekunder"
      >
        <RotateCwIcon size={skipIconSize} />
        <span className={styles.skipLabel}>30</span>
      </button>
    </div>
  );
}
