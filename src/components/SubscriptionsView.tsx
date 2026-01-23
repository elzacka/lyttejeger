import { useState } from 'react';
import { X as CloseIcon } from 'lucide-react';
import type { Subscription } from '../services/db';
import styles from './SubscriptionsView.module.css';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  onUnsubscribe: (podcastId: string) => void;
  onSelectPodcast: (podcastId: string) => void;
}

export function SubscriptionsView({
  subscriptions,
  onUnsubscribe,
  onSelectPodcast,
}: SubscriptionsViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUnsubscribeClick = (e: React.MouseEvent, podcastId: string) => {
    e.stopPropagation(); // Prevent triggering podcast navigation

    if (confirmDeleteId === podcastId) {
      // Second click confirms deletion
      onUnsubscribe(podcastId);
      setConfirmDeleteId(null);
    } else {
      // First click shows confirmation
      setConfirmDeleteId(podcastId);
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setConfirmDeleteId((current) => current === podcastId ? null : current);
      }, 3000);
    }
  };

  if (subscriptions.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>Du følger ingen podcaster ennå</h3>
        <p>Søk etter podcaster og trykk på Følg for å abonnere</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mine podder</h2>
        <span className={styles.count}>{subscriptions.length}</span>
      </div>

      <div className={styles.grid}>
        {subscriptions.map((sub) => {
          const isConfirming = confirmDeleteId === sub.podcastId;

          return (
            <article
              key={sub.podcastId}
              className={`${styles.card} ${isConfirming ? styles.cardConfirming : ''}`}
            >
              {/* Main clickable area for navigation */}
              <button
                className={styles.cardButton}
                onClick={() => onSelectPodcast(sub.podcastId)}
                aria-label={`Gå til ${sub.title}`}
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

              {/* Delete button - appears on hover/long-press */}
              <button
                className={`${styles.deleteButton} ${isConfirming ? styles.deleteButtonConfirm : ''}`}
                onClick={(e) => handleUnsubscribeClick(e, sub.podcastId)}
                aria-label={isConfirming ? `Bekreft avslutning av ${sub.title}` : `Avslutt abonnement på ${sub.title}`}
                title={isConfirming ? 'Klikk igjen for å bekrefte' : 'Avslutt abonnement'}
              >
                <CloseIcon size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// Default export for lazy loading
export default SubscriptionsView;
