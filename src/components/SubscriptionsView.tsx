import { useState, useRef, useCallback } from 'react'
import type { Subscription } from '../services/db'
import styles from './SubscriptionsView.module.css'

interface SubscriptionsViewProps {
  subscriptions: Subscription[]
  onUnsubscribe: (podcastId: string) => void
  onSelectPodcast: (podcastId: string) => void
}

interface SwipeState {
  itemId: string | null
  startX: number
  currentX: number
  isSwiping: boolean
}

export function SubscriptionsView({
  subscriptions,
  onUnsubscribe,
  onSelectPodcast,
}: SubscriptionsViewProps) {
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null)
  const swipeRef = useRef<SwipeState>({
    itemId: null,
    startX: 0,
    currentX: 0,
    isSwiping: false,
  })
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const SWIPE_THRESHOLD = 80

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, itemId: string) => {
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
        isSwiping: false,
      }
    },
    [swipedItemId]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent, itemId: string) => {
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

  const handleTouchEnd = useCallback(
    (itemId: string) => {
      const deltaX = swipeRef.current.startX - swipeRef.current.currentX
      const element = itemRefs.current.get(itemId)
      const content = element?.querySelector(`.${styles.swipeContent}`) as HTMLElement

      if (deltaX > SWIPE_THRESHOLD) {
        // Reveal unsubscribe button
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
    },
    [swipedItemId]
  )

  const handleUnsubscribe = useCallback(
    (podcastId: string) => {
      onUnsubscribe(podcastId)
      setSwipedItemId(null)
    },
    [onUnsubscribe]
  )

  if (subscriptions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="material-symbols-outlined" aria-hidden="true">
          bookmark_border
        </span>
        <h3>Du følger ingen podcaster ennå</h3>
        <p>Søk etter podcaster og trykk på Følg for å abonnere</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mine podder</h2>
        <span className={styles.count}>{subscriptions.length}</span>
      </div>
      <p className={styles.swipeHint}>Sveip for å avslutte abonnement</p>
      <ul className={styles.list}>
        {subscriptions.map((sub) => (
          <li
            key={sub.podcastId}
            className={styles.item}
            ref={(el) => {
              if (el) itemRefs.current.set(sub.podcastId, el)
            }}
            onTouchStart={(e) => handleTouchStart(e, sub.podcastId)}
            onTouchMove={(e) => handleTouchMove(e, sub.podcastId)}
            onTouchEnd={() => handleTouchEnd(sub.podcastId)}
          >
            {/* Unsubscribe action revealed on swipe */}
            <div className={styles.swipeAction}>
              <button
                className={styles.unsubscribeButton}
                onClick={() => handleUnsubscribe(sub.podcastId)}
                aria-label={`Avslutt abonnement på ${sub.title}`}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>

            {/* Swipeable content */}
            <div className={styles.swipeContent}>
              <button
                className={styles.podcastButton}
                onClick={() => onSelectPodcast(sub.podcastId)}
              >
                <img
                  src={sub.imageUrl}
                  alt=""
                  className={styles.image}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = document.createElement('div')
                    placeholder.className = `${styles.image} image-placeholder`
                    placeholder.innerHTML =
                      '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                    target.parentNode?.insertBefore(placeholder, target)
                  }}
                />
                <div className={styles.info}>
                  <span className={styles.podcastTitle}>{sub.title}</span>
                  <span className={styles.author}>{sub.author}</span>
                </div>
              </button>
              {/* Desktop: show unsubscribe button */}
              <button
                className={styles.desktopUnsubscribe}
                onClick={() => handleUnsubscribe(sub.podcastId)}
                aria-label={`Avslutt abonnement på ${sub.title}`}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
