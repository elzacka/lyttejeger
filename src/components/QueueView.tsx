import { useState, useRef, useCallback } from 'react';
import { Trash2 as TrashIcon, ChevronUp, ChevronDown } from 'lucide-react';
import type { QueueItem } from '../services/db';
import type { Episode } from '../types/podcast';
import type { PlaybackProgress } from '../hooks/usePlaybackProgress';
import { ConfirmDialog } from './ConfirmDialog';
import { EpisodeCard } from './EpisodeCard';
import styles from './QueueView.module.css';

interface QueueViewProps {
  queue: QueueItem[];
  onPlay: (item: QueueItem) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  getProgress?: (episodeId: string) => PlaybackProgress | null;
}

/**
 * Convert QueueItem to Episode for EpisodeCard
 */
function queueItemToEpisode(item: QueueItem): Episode {
  return {
    id: item.episodeId,
    podcastId: item.podcastId,
    title: item.title,
    description: item.description || '', // Use description from queue item
    audioUrl: item.audioUrl,
    duration: item.duration || 0,
    publishedAt: item.publishedAt || '',
    imageUrl: item.imageUrl,
    transcriptUrl: item.transcriptUrl,
    chaptersUrl: item.chaptersUrl,
    season: item.season,
    episode: item.episode,
  };
}

export function QueueView({
  queue,
  onPlay,
  onRemove,
  onClear,
  onReorder,
  getProgress,
}: QueueViewProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const longPressTimer = useRef<number | null>(null);

  // Long-press for reorder mode (mobile and desktop)
  const handleLongPressStart = useCallback((index: number) => (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default to avoid text selection on desktop
    if ('button' in e && e.button !== 0) return; // Only left click on desktop

    longPressTimer.current = window.setTimeout(() => {
      setReorderMode(true);
      setSelectedItemIndex(index);
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleMoveUp = useCallback(() => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      onReorder(selectedItemIndex, selectedItemIndex - 1);
      setSelectedItemIndex(selectedItemIndex - 1);
    }
  }, [selectedItemIndex, onReorder]);

  const handleMoveDown = useCallback(() => {
    if (selectedItemIndex !== null && selectedItemIndex < queue.length - 1) {
      onReorder(selectedItemIndex, selectedItemIndex + 1);
      setSelectedItemIndex(selectedItemIndex + 1);
    }
  }, [selectedItemIndex, queue.length, onReorder]);

  const handleExitReorderMode = useCallback(() => {
    setReorderMode(false);
    setSelectedItemIndex(null);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedItemIndex !== null) {
      const item = queue[selectedItemIndex];
      if (item.id) {
        onRemove(item.id);
        setReorderMode(false);
        setSelectedItemIndex(null);
      }
    }
  }, [selectedItemIndex, queue, onRemove]);

  if (queue.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>Køen er tom</h3>
        <p>Legg til episoder fra søkeresultatene eller en podcast-side</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Min kø</h2>
        <button
          className={styles.clearButton}
          onClick={() => setShowClearConfirm(true)}
          aria-label="Tøm køen"
          title="Tøm køen"
        >
          <TrashIcon size={20} />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={onClear}
        title="Tøm køen?"
        message={`Er du sikker på at du vil fjerne alle ${queue.length} episoder fra køen?`}
        confirmText="Tøm køen"
        cancelText="Avbryt"
        variant="danger"
      />

      <p className={styles.count}>
        {queue.length} {queue.length === 1 ? 'episode' : 'episoder'}
      </p>

      <ul className={styles.list} role="list">
        {queue.map((item, index) => {
          const isSelected = reorderMode && selectedItemIndex === index;

          return (
            <li
              key={item.id}
              className={`${isSelected ? styles.selectedItem : ''} ${styles.queueItem}`}
              style={{ position: 'relative' }}
            >
              <div
                className={styles.longPressWrapper}
                onTouchStart={!reorderMode ? handleLongPressStart(index) : undefined}
                onTouchEnd={!reorderMode ? handleLongPressEnd : undefined}
                onTouchCancel={!reorderMode ? handleLongPressEnd : undefined}
                onMouseDown={!reorderMode ? handleLongPressStart(index) : undefined}
                onMouseUp={!reorderMode ? handleLongPressEnd : undefined}
                onMouseLeave={!reorderMode ? handleLongPressEnd : undefined}
              >
                <EpisodeCard
                  episode={queueItemToEpisode(item)}
                  podcastInfo={{
                    id: item.podcastId,
                    title: item.podcastTitle,
                    imageUrl: item.podcastImage,
                  }}
                  showPodcastInfo={true}
                  progress={getProgress?.(item.episodeId)}
                  variant="queue"
                  onPlay={() => onPlay(item)}
                  isDraggable={false}
                />
              </div>

              {/* Reorder toolbar - appears as popup next to selected item */}
              {isSelected && (
                <div className={styles.itemToolbar}>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleMoveUp}
                    disabled={selectedItemIndex === 0}
                    aria-label="Flytt opp"
                    title="Flytt opp"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button
                    className={styles.toolbarButton}
                    onClick={handleMoveDown}
                    disabled={selectedItemIndex === queue.length - 1}
                    aria-label="Flytt ned"
                    title="Flytt ned"
                  >
                    <ChevronDown size={20} />
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${styles.deleteButton}`}
                    onClick={handleDeleteSelected}
                    aria-label="Slett episode"
                    title="Slett episode"
                  >
                    <TrashIcon size={18} />
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${styles.doneButton}`}
                    onClick={handleExitReorderMode}
                    aria-label="Ferdig"
                    title="Ferdig"
                  >
                    Ferdig
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

    </div>
  );
}

// Default export for lazy loading
export default QueueView;
