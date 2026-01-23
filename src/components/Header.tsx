import { Headphones as HeadphonesIcon } from 'lucide-react';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <HeadphonesIcon size={24} className={styles.logoIcon} aria-hidden="true" />
        <span className={styles.logoText}>Lyttejeger</span>
      </div>
    </header>
  );
}
