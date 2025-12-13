import { useState } from 'react'
import { InfoSheet } from './InfoSheet'
import { InstallSheet } from './InstallSheet'
import { shouldShowInstallButton } from '../utils/deviceDetection'
import { useSheetContext } from '../hooks/useSheetContext'
import styles from './BottomNav.module.css'

export type NavItem = 'home' | 'search' | 'subscriptions' | 'queue' | 'info'

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
  const [installOpen, setInstallOpen] = useState(false)
  const { hasOpenSheet } = useSheetContext()

  // Check if we should show install button (only in browser, not standalone)
  const showInstall = shouldShowInstallButton()

  return (
    <>
      <nav className={`${styles.nav} ${hasOpenSheet ? styles.hidden : ''}`} aria-label="Hovednavigasjon">
        <button
          className={`${styles.navItem} ${activeItem === 'search' ? styles.active : ''}`}
          onClick={() => onNavigate('search')}
          aria-current={activeItem === 'search' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
          </span>
          <span className={styles.label}>Søk</span>
        </button>

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
          <span className={styles.label}>Podder</span>
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'home' ? styles.active : ''}`}
          onClick={() => onNavigate('home')}
          aria-current={activeItem === 'home' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
          </span>
          <span className={styles.label}>Siste</span>
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
          onClick={() => setInfoOpen(true)}
          aria-haspopup="dialog"
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">
              {showInstall ? 'more_horiz' : 'info'}
            </span>
          </span>
          <span className={styles.label}>Mer</span>
        </button>
      </nav>

      <InstallSheet isOpen={installOpen} onClose={() => setInstallOpen(false)} />
      <InfoSheet
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        showInstall={showInstall}
        onInstallClick={() => {
          setInfoOpen(false)
          setInstallOpen(true)
        }}
      />
    </>
  )
}
