import { WifiOffIcon } from '@designsystem/core';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <WifiOffIcon size={18} aria-hidden="true" />
      <span>Ingen nettverkstilkobling</span>
    </div>
  );
}
