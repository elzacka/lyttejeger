import { useState, useRef, useCallback } from 'react';
import { TrashIcon, GripVerticalIcon, PodcastIcon, CloseIcon, PlayIcon } from './icons';
import type { QueueItem } from '../services/db';
import { formatDuration } from '../utils/search';
import { SWIPE_THRESHOLD_PX } from '../constants';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './QueueView.module.css';

interface QueueViewProps {
  queue: QueueItem[];
  onPlay: (item: QueueItem) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
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

export function QueueView({ queue, onPlay, onRemove, onClear, onReorder }: QueueViewProps) {
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
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const listRef = useRef<HTMLUListElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, itemId: number | undefined) => {
      // Reset any other swiped items
      if (swipedItemId && swipedItemId !== itemId) {
        const prevElement = itemRefs.current.get(swipedItemId);
        const prevContent = prevElement?.querySelector(`.${styles.swipeContent}`) as HTMLElement;
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

  const handleTouchMove = useCallback((e: React.TouchEvent, itemId: number | undefined) => {
    if (!itemId) return;

    const touch = e.touches[0];
    const deltaX = swipeRef.current.startX - touch.clientX;
    swipeRef.current.currentX = touch.clientX;

    // Only start swiping if horizontal movement is significant
    if (Math.abs(deltaX) > 10) {
      swipeRef.current.isSwiping = true;
    }

    if (swipeRef.current.isSwiping) {
      const element = itemRefs.current.get(itemId);
      if (element) {
        const translateX = Math.max(0, Math.min(deltaX, SWIPE_THRESHOLD_PX + 20));
        const content = element.querySelector(`.${styles.swipeContent}`) as HTMLElement;
        if (content) {
          content.style.transform = `translateX(-${translateX}px)`;
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(
    (itemId: number | undefined) => {
      if (!itemId) return;

      const deltaX = swipeRef.current.startX - swipeRef.current.currentX;
      const element = itemRefs.current.get(itemId);
      const content = element?.querySelector(`.${styles.swipeContent}`) as HTMLElement;

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
    (e: React.TouchEvent, index: number) => {
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
    (e: React.MouseEvent, index: number) => {
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
            <li
              key={item.id}
              className={`${styles.item} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
              ref={(el) => {
                if (el && item.id) itemRefs.current.set(item.id, el);
              }}
              onTouchStart={(e) => handleTouchStart(e, item.id)}
              onTouchMove={(e) => handleTouchMove(e, item.id)}
              onTouchEnd={() => handleTouchEnd(item.id)}
            >
              {/* Delete action revealed on swipe */}
              <div className={styles.swipeAction}>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleRemove(item.id)}
                  aria-label="Fjern fra kø"
                >
                  <TrashIcon size={20} />
                </button>
              </div>

              {/* Swipeable content */}
              <div className={styles.swipeContent}>
                <div className={styles.topRow}>
                  {/* Drag handle */}
                  <button
                    className={styles.dragHandle}
                    onMouseDown={(e) => handleDragMouseDown(e, index)}
                    onTouchStart={(e) => handleDragTouchStart(e, index)}
                    onTouchMove={handleDragTouchMove}
                    onTouchEnd={handleDragTouchEnd}
                    aria-label="Dra for å sortere"
                  >
                    <GripVerticalIcon size={20} />
                  </button>

                  <div className={styles.imageContainer}>
                    {item.imageUrl || item.podcastImage ? (
                      <img
                        src={item.imageUrl || item.podcastImage}
                        alt=""
                        className={styles.image}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className={`${styles.image} image-placeholder`}>
                        <PodcastIcon size={24} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className={styles.content}>
                    <p className={styles.podcastName}>{item.podcastTitle}</p>
                    <p className={styles.episodeTitle}>{item.title}</p>
                    {item.duration && (
                      <p className={styles.duration}>{formatDuration(item.duration)}</p>
                    )}
                  </div>

                  <div className={styles.actions}>
                    {/* Desktop: remove button */}
                    <button
                      className={`${styles.actionButton} ${styles.desktopOnly}`}
                      onClick={() => item.id && onRemove(item.id)}
                      aria-label="Fjern fra kø"
                    >
                      <CloseIcon size={18} />
                    </button>

                    <button
                      className={styles.playButton}
                      onClick={() => onPlay(item)}
                      aria-label={`Spill ${item.title}`}
                    >
                      <PlayIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
