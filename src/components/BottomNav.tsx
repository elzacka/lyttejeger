import { useState } from 'react'
import { InfoSheet } from './InfoSheet'
import styles from './BottomNav.module.css'

export type NavItem = 'subscriptions' | 'queue' | 'info'

interface BottomNavProps {
  activeItem: NavItem | null
  onNavigate: (item: NavItem) => void
  queueCount: number
  subscriptionCount: number
}

export function BottomNav({
  activeItem,
  onNavigate,
  queueCount,
  subscriptionCount,
}: BottomNavProps) {
  const [infoOpen, setInfoOpen] = useState(false)

  const handleInfoClick = () => {
    setInfoOpen(true)
  }

  return (
    <>
      <nav className={styles.nav} aria-label="Hovednavigasjon">
        <button
          className={`${styles.navItem} ${activeItem === 'subscriptions' ? styles.active : ''}`}
          onClick={() => onNavigate('subscriptions')}
          aria-current={activeItem === 'subscriptions' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">
              {activeItem === 'subscriptions' ? 'bookmark' : 'bookmark_border'}
            </span>
            {subscriptionCount > 0 && (
              <span className={styles.badge}>{subscriptionCount}</span>
            )}
          </span>
          <span className={styles.label}>Mine podder</span>
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'queue' ? styles.active : ''}`}
          onClick={() => onNavigate('queue')}
          aria-current={activeItem === 'queue' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">
              queue_music
            </span>
            {queueCount > 0 && (
              <span className={styles.badge}>{queueCount}</span>
            )}
          </span>
          <span className={styles.label}>Kø</span>
        </button>

        <button
          className={styles.navItem}
          onClick={handleInfoClick}
          aria-haspopup="dialog"
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
          </span>
          <span className={styles.label}>Info</span>
        </button>
      </nav>

      <InfoSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
