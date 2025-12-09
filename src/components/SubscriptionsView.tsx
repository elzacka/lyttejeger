import type { Subscription } from '../services/db'
import styles from './SubscriptionsView.module.css'

interface SubscriptionsViewProps {
  subscriptions: Subscription[]
  onUnsubscribe: (podcastId: string) => void
  onSelectPodcast: (podcastId: string) => void
}

export function SubscriptionsView({
  subscriptions,
  onUnsubscribe,
  onSelectPodcast,
}: SubscriptionsViewProps) {
  if (subscriptions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="material-symbols-outlined" aria-hidden="true">
          notifications_off
        </span>
        <h3>Ingen abonnementer</h3>
        <p>Abonner på podcaster for å se nye episoder her</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Abonnementer</h2>
        <span className={styles.count}>{subscriptions.length}</span>
      </div>
      <ul className={styles.list}>
        {subscriptions.map((sub) => (
          <li key={sub.podcastId} className={styles.item}>
            <button
              className={styles.podcastButton}
              onClick={() => onSelectPodcast(sub.podcastId)}
            >
              <img
                src={sub.imageUrl}
                alt=""
                className={styles.image}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.svg'
                }}
              />
              <div className={styles.info}>
                <span className={styles.podcastTitle}>{sub.title}</span>
                <span className={styles.author}>{sub.author}</span>
              </div>
            </button>
            <button
              className={styles.unsubscribeButton}
              onClick={() => onUnsubscribe(sub.podcastId)}
              aria-label={`Avslutt abonnement på ${sub.title}`}
            >
              <span className="material-symbols-outlined">notifications_off</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
