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
          aria-label="Mine podcaster"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {activeItem === 'subscriptions' ? 'bookmark' : 'bookmark_border'}
          </span>
          {subscriptionCount > 0 && (
            <span className={styles.badge}>{subscriptionCount}</span>
          )}
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'queue' ? styles.active : ''}`}
          onClick={() => onNavigate('queue')}
          aria-current={activeItem === 'queue' ? 'page' : undefined}
          aria-label="Kø"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {activeItem === 'queue' ? 'queue_music' : 'queue_music'}
          </span>
          {queueCount > 0 && (
            <span className={styles.badge}>{queueCount}</span>
          )}
        </button>

        <button
          className={styles.navItem}
          onClick={handleInfoClick}
          aria-haspopup="dialog"
          aria-label="Info"
        >
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
        </button>
      </nav>

      <InfoSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
