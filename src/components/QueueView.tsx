import { useState, useRef, useCallback } from 'react'
import type { QueueItem } from '../services/db'
import { formatDuration } from '../utils/search'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './QueueView.module.css'

interface QueueViewProps {
  queue: QueueItem[]
  onPlay: (item: QueueItem) => void
  onRemove: (id: number) => void
  onClear: () => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

interface SwipeState {
  itemId: number | undefined
  startX: number
  currentX: number
  isSwiping: boolean
}

export function QueueView({
  queue,
  onPlay,
  onRemove,
  onClear,
  onMoveUp,
  onMoveDown,
}: QueueViewProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [swipedItemId, setSwipedItemId] = useState<number | null>(null)
  const swipeRef = useRef<SwipeState>({ itemId: undefined, startX: 0, currentX: 0, isSwiping: false })
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map())

  const SWIPE_THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: number | undefined) => {
    // Reset any other swiped items
    if (swipedItemId && swipedItemId !== itemId) {
      const prevElement = itemRefs.current.get(swipedItemId)
      const prevContent = prevElement?.querySelector(`.${styles.swipeContent}`) as HTMLElement
      if (prevContent) {
        prevContent.style.transform = 'translateX(0)'
      }
      setSwipedItemId(null)
    }

    swipeRef.current = {
      itemId,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      isSwiping: false
    }
  }, [swipedItemId])

  const handleTouchMove = useCallback((e: React.TouchEvent, itemId: number | undefined) => {
    if (!itemId) return

    const touch = e.touches[0]
    const deltaX = swipeRef.current.startX - touch.clientX
    swipeRef.current.currentX = touch.clientX

    // Only start swiping if horizontal movement is significant
    if (Math.abs(deltaX) > 10) {
      swipeRef.current.isSwiping = true
    }

    if (swipeRef.current.isSwiping) {
      const element = itemRefs.current.get(itemId)
      if (element) {
        const translateX = Math.max(0, Math.min(deltaX, SWIPE_THRESHOLD + 20))
        const content = element.querySelector(`.${styles.swipeContent}`) as HTMLElement
        if (content) {
          content.style.transform = `translateX(-${translateX}px)`
        }
      }
    }
  }, [])

  const handleTouchEnd = useCallback((itemId: number | undefined) => {
    if (!itemId) return

    const deltaX = swipeRef.current.startX - swipeRef.current.currentX
    const element = itemRefs.current.get(itemId)
    const content = element?.querySelector(`.${styles.swipeContent}`) as HTMLElement

    if (deltaX > SWIPE_THRESHOLD) {
      // Reveal delete button
      if (content) {
        content.style.transform = `translateX(-${SWIPE_THRESHOLD}px)`
      }
      setSwipedItemId(itemId)
    } else {
      // Reset position
      if (content) {
        content.style.transform = 'translateX(0)'
      }
      if (swipedItemId === itemId) {
        setSwipedItemId(null)
      }
    }

    swipeRef.current.isSwiping = false
  }, [swipedItemId])

  const handleRemove = useCallback((itemId: number | undefined) => {
    if (!itemId) return
    onRemove(itemId)
    setSwipedItemId(null)
  }, [onRemove])

  if (queue.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="material-symbols-outlined" aria-hidden="true">queue_music</span>
        <h3>Køen er tom</h3>
        <p>Legg til episoder fra søkeresultatene eller en podcast-side</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Kø</h2>
        <button
          className={styles.clearButton}
          onClick={() => setShowClearConfirm(true)}
          aria-label="Tøm køen"
        >
          <span className="material-symbols-outlined">delete_sweep</span>
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

      <ul className={styles.list} role="list">
        {queue.map((item, index) => (
          <li
            key={item.id}
            className={styles.item}
            ref={(el) => {
              if (el && item.id) itemRefs.current.set(item.id, el)
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
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>

            {/* Swipeable content */}
            <div className={styles.swipeContent}>
              <div className={styles.topRow}>
                <div className={styles.position}>{index + 1}</div>

                <div className={styles.imageContainer}>
                  {(item.imageUrl || item.podcastImage) ? (
                    <img
                      src={item.imageUrl || item.podcastImage}
                      alt=""
                      className={styles.image}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const placeholder = document.createElement('div')
                        placeholder.className = `${styles.image} image-placeholder`
                        placeholder.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                        target.parentNode?.appendChild(placeholder)
                      }}
                    />
                  ) : (
                    <div className={`${styles.image} image-placeholder`}>
                      <span className="material-symbols-outlined" aria-hidden="true">podcasts</span>
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

                {/* Desktop actions - hidden on mobile */}
                <div className={styles.actionsDesktop}>
                  <button
                    className={styles.actionButton}
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Flytt opp"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => onMoveDown(index)}
                    disabled={index === queue.length - 1}
                    aria-label="Flytt ned"
                  >
                    <span className="material-symbols-outlined">arrow_downward</span>
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => item.id && onRemove(item.id)}
                    aria-label="Fjern fra kø"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <button
                  className={styles.playButton}
                  onClick={() => onPlay(item)}
                  aria-label={`Spill ${item.title}`}
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>

              {/* Mobile actions - shown at bottom */}
              <div className={styles.actionsMobile}>
                <button
                  className={styles.actionButton}
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Flytt opp"
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => onMoveDown(index)}
                  disabled={index === queue.length - 1}
                  aria-label="Flytt ned"
                >
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
