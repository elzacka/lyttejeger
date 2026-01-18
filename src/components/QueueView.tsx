import { useState, useRef, useCallback } from 'react';
import { TrashIcon } from './icons';
import type { QueueItem } from '../services/db';
import type { Episode } from '../types/podcast';
import type { PlaybackProgress } from '../hooks/usePlaybackProgress';
import { SWIPE_THRESHOLD_PX } from '../constants';
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

interface SwipeState {
  itemId: number | undefined;
  startX: number;
  currentX: number;
  isSwiping: boolean;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
  startY: number;
  currentY: number;
}

/**
 * Convert QueueItem to Episode for EpisodeCard
 */
function queueItemToEpisode(item: QueueItem): Episode {
  return {
    id: item.episodeId,
    podcastId: item.podcastId,
    title: item.title,
    description: '',
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
  const [swipedItemId, setSwipedItemId] = useState<number | null>(null);
  const swipeRef = useRef<SwipeState>({
    itemId: undefined,
    startX: 0,
    currentX: 0,
    isSwiping: false,
  });
  const dragRef = useRef<DragState>({
    isDragging: false,
    dragIndex: null,
    dragOverIndex: null,
    startY: 0,
    currentY: 0,
  });
  const [dragState, setDragState] = useState<{
    dragIndex: number | null;
    dragOverIndex: number | null;
  }>({ dragIndex: null, dragOverIndex: null });
  const swipeContentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLUListElement>(null);

  const handleTouchStart = useCallback(
    (itemId: number | undefined) => (e: React.TouchEvent) => {
      // Reset any other swiped items
      if (swipedItemId && swipedItemId !== itemId) {
        const prevContent = swipeContentRefs.current.get(swipedItemId);
        if (prevContent) {
          prevContent.style.transform = 'translateX(0)';
        }
        setSwipedItemId(null);
      }

      swipeRef.current = {
        itemId,
        startX: e.touches[0].clientX,
        currentX: e.touches[0].clientX,
        isSwiping: false,
      };
    },
    [swipedItemId]
  );

  const handleTouchMove = useCallback(
    (itemId: number | undefined) => (e: React.TouchEvent) => {
      if (!itemId) return;

      const touch = e.touches[0];
      const deltaX = swipeRef.current.startX - touch.clientX;
      swipeRef.current.currentX = touch.clientX;

      // Only start swiping if horizontal movement is significant
      if (Math.abs(deltaX) > 10) {
        swipeRef.current.isSwiping = true;
      }

      if (swipeRef.current.isSwiping) {
        const content = swipeContentRefs.current.get(itemId);
        if (content) {
          const translateX = Math.max(0, Math.min(deltaX, SWIPE_THRESHOLD_PX + 20));
          content.style.transform = `translateX(-${translateX}px)`;
        }
      }
    },
    []
  );

  const handleTouchEnd = useCallback(
    (itemId: number | undefined) => () => {
      if (!itemId) return;

      const deltaX = swipeRef.current.startX - swipeRef.current.currentX;
      const content = swipeContentRefs.current.get(itemId);

      if (deltaX > SWIPE_THRESHOLD_PX) {
        // Reveal delete button
        if (content) {
          content.style.transform = `translateX(-${SWIPE_THRESHOLD_PX}px)`;
        }
        setSwipedItemId(itemId);
      } else {
        // Reset position
        if (content) {
          content.style.transform = 'translateX(0)';
        }
        if (swipedItemId === itemId) {
          setSwipedItemId(null);
        }
      }

      swipeRef.current.isSwiping = false;
    },
    [swipedItemId]
  );

  const handleRemove = useCallback(
    (itemId: number | undefined) => {
      if (!itemId) return;
      onRemove(itemId);
      setSwipedItemId(null);
    },
    [onRemove]
  );

  // Drag-to-reorder handlers
  const getItemIndexFromY = useCallback((y: number): number | null => {
    if (!listRef.current) return null;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return i;
      }
    }
    // If above first item
    if (items.length > 0 && y < items[0].getBoundingClientRect().top) {
      return 0;
    }
    // If below last item
    if (items.length > 0 && y > items[items.length - 1].getBoundingClientRect().bottom) {
      return items.length - 1;
    }
    return null;
  }, []);

  const handleDragStart = useCallback((index: number, clientY: number) => {
    dragRef.current = {
      isDragging: true,
      dragIndex: index,
      dragOverIndex: index,
      startY: clientY,
      currentY: clientY,
    };
    setDragState({ dragIndex: index, dragOverIndex: index });
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragRef.current.isDragging) return;
      dragRef.current.currentY = clientY;
      const overIndex = getItemIndexFromY(clientY);
      if (overIndex !== null && overIndex !== dragRef.current.dragOverIndex) {
        dragRef.current.dragOverIndex = overIndex;
        setDragState((prev) => ({ ...prev, dragOverIndex: overIndex }));
      }
    },
    [getItemIndexFromY]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return;
    const { dragIndex, dragOverIndex } = dragRef.current;
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorder(dragIndex, dragOverIndex);
    }
    dragRef.current = {
      isDragging: false,
      dragIndex: null,
      dragOverIndex: null,
      startY: 0,
      currentY: 0,
    };
    setDragState({ dragIndex: null, dragOverIndex: null });
  }, [onReorder]);

  // Touch drag handlers for the drag handle
  const handleDragTouchStart = useCallback(
    (index: number) => (e: React.TouchEvent) => {
      e.stopPropagation(); // Prevent swipe-to-delete from triggering
      handleDragStart(index, e.touches[0].clientY);
    },
    [handleDragStart]
  );

  const handleDragTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragRef.current.isDragging) {
        e.preventDefault(); // Prevent scrolling while dragging
        handleDragMove(e.touches[0].clientY);
      }
    },
    [handleDragMove]
  );

  const handleDragTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse drag handlers for desktop
  const handleDragMouseDown = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(index, e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e.clientY);
      };

      const handleMouseUp = () => {
        handleDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd]
  );

  const setSwipeContentRef = useCallback(
    (itemId: number) => (el: HTMLDivElement | null) => {
      if (el) {
        swipeContentRefs.current.set(itemId, el);
      } else {
        swipeContentRefs.current.delete(itemId);
      }
    },
    []
  );

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
        >
          <TrashIcon size={18} />
          Tøm
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
        <span className={styles.swipeHint}> · Sveip for å fjerne</span>
      </p>

      <ul className={styles.list} role="list" ref={listRef}>
        {queue.map((item, index) => {
          const isDragging = dragState.dragIndex === index;
          const isDragOver = dragState.dragOverIndex === index && dragState.dragIndex !== index;

          return (
            <li key={item.id}>
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
                onRemove={() => item.id && handleRemove(item.id)}
                isDraggable={true}
                isDragging={isDragging}
                isDragOver={isDragOver}
                onDragTouchStart={handleDragTouchStart(index)}
                onDragTouchMove={handleDragTouchMove}
                onDragTouchEnd={handleDragTouchEnd}
                onDragMouseDown={handleDragMouseDown(index)}
                isSwipeable={true}
                onSwipeTouchStart={handleTouchStart(item.id)}
                onSwipeTouchMove={handleTouchMove(item.id)}
                onSwipeTouchEnd={handleTouchEnd(item.id)}
                isSwipedOpen={swipedItemId === item.id}
                swipeContentRef={item.id ? setSwipeContentRef(item.id) : undefined}
                hideExpand={true}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
