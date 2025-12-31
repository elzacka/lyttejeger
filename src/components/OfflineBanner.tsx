import { useOnlineStatus } from '../hooks/useOnlineStatus'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
      <span>Ingen nettverkstilkobling</span>
    </div>
  )
}
