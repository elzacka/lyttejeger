import { useState, useEffect } from 'react'
import { InfoSheet } from './InfoSheet'
import { InstallSheet } from './InstallSheet'
import { shouldShowInstallButton } from '../utils/deviceDetection'
import styles from './BottomNav.module.css'

export type NavItem = 'home' | 'subscriptions' | 'queue' | 'info'

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
  const [showInstall, setShowInstall] = useState(false)

  // Check if we should show install button (only in browser, not standalone)
  useEffect(() => {
    setShowInstall(shouldShowInstallButton())
  }, [])

  const handleInfoClick = () => {
    setInfoOpen(true)
  }

  const handleInstallClick = () => {
    setInstallOpen(true)
  }

  return (
    <>
      <nav className={styles.nav} aria-label="Hovednavigasjon">
        {showInstall && (
          <button
            className={styles.navItem}
            onClick={handleInstallClick}
            aria-haspopup="dialog"
          >
            <span className={styles.iconWrapper}>
              <span className="material-symbols-outlined" aria-hidden="true">download</span>
            </span>
            <span className={styles.label}>Installer</span>
          </button>
        )}

        <button
          className={`${styles.navItem} ${activeItem === 'home' ? styles.active : ''}`}
          onClick={() => onNavigate('home')}
          aria-current={activeItem === 'home' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <span className="material-symbols-outlined" aria-hidden="true">
              {activeItem === 'home' ? 'home' : 'home'}
            </span>
          </span>
          <span className={styles.label}>Hjem</span>
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

      <InstallSheet isOpen={installOpen} onClose={() => setInstallOpen(false)} />
      <InfoSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
