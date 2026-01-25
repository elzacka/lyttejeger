import { useState, useRef } from 'react';
import { X as CloseIcon } from 'lucide-react';
import type { Subscription } from '../services/db';
import styles from './MyPodsView.module.css';

interface MyPodsViewProps {
  subscriptions: Subscription[];
  onUnsubscribe: (podcastId: string) => void;
  onSelectPodcast: (podcastId: string) => void;
}

export function MyPodsView({
  subscriptions,
  onUnsubscribe,
  onSelectPodcast,
}: MyPodsViewProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Subscription | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (subscription: Subscription) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedPodcast(subscription);
      setShowDeleteDialog(true);
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (podcastId: string) => {
    // Only navigate if not triggered by long press
    if (!longPressTriggered.current) {
      onSelectPodcast(podcastId);
    }
    longPressTriggered.current = false;
  };

  const handleDelete = () => {
    if (selectedPodcast) {
      onUnsubscribe(selectedPodcast.podcastId);
      setShowDeleteDialog(false);
      setSelectedPodcast(null);
    }
  };

  const handleCancel = () => {
    setShowDeleteDialog(false);
    setSelectedPodcast(null);
  };

  const handleDesktopDelete = (e: React.MouseEvent, subscription: Subscription) => {
    e.stopPropagation(); // Prevent navigation
    setSelectedPodcast(subscription);
    setShowDeleteDialog(true);
  };

  if (subscriptions.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Du følger ingen podcaster ennå</p>
      </div>
    );
  }

  // Sort subscriptions alphabetically by title
  const sortedSubscriptions = [...subscriptions].sort((a, b) =>
    a.title.localeCompare(b.title, 'nb-NO', { sensitivity: 'base' })
  );

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Mine podder
            <span className={styles.badge}>{subscriptions.length}</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {sortedSubscriptions.map((sub) => {
            return (
              <article key={sub.podcastId} className={styles.card}>
                {/* Main clickable area for navigation with long-press support */}
                <button
                  className={styles.cardButton}
                  onClick={() => handleClick(sub.podcastId)}
                  onTouchStart={() => handleTouchStart(sub)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  aria-label={`Gå til ${sub.title}`}
                  title={sub.title}
                >
                  <div className={styles.imageWrapper}>
                    <img
                      src={sub.imageUrl}
                      alt=""
                      className={styles.image}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className={styles.podcastTitle}>{sub.title}</h3>
                </button>
                {/* Desktop-only delete button */}
                <button
                  className={styles.desktopDeleteButton}
                  onClick={(e) => handleDesktopDelete(e, sub)}
                  aria-label={`Slett ${sub.title}`}
                  title="Slett"
                >
                  <CloseIcon size={16} />
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && selectedPodcast && (
        <div className={styles.dialogOverlay} onClick={handleCancel}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>Slutt å følge?</h3>
            <p className={styles.dialogText}>{selectedPodcast.title}</p>
            <div className={styles.dialogButtons}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Avbryt
              </button>
              <button className={styles.deleteButton} onClick={handleDelete}>
                Ja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Default export for lazy loading
export default MyPodsView;
