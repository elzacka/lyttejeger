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
        <span className="material-symbols-outlined" aria-hidden="true">bookmark_border</span>
        <h3>Du følger ingen podcaster ennå</h3>
        <p>Søk etter podcaster og trykk på klokken for å følge</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mine podder</h2>
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
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const placeholder = document.createElement('div')
                  placeholder.className = `${styles.image} image-placeholder`
                  placeholder.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                  target.parentNode?.insertBefore(placeholder, target)
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
