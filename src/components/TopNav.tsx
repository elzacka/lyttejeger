import {
  Search as SearchIcon,
  Clock as ClockIcon,
  Heart as HeartIcon,
  ListMusic as ListMusicIcon,
  Headphones as HeadphonesIcon,
} from 'lucide-react';
import { InfoPopover } from './InfoPopover';
import { useSheetContext } from '../hooks/useSheetContext';
import styles from './TopNav.module.css';

export type NavItem = 'home' | 'search' | 'subscriptions' | 'queue' | 'info';

interface TopNavProps {
  activeItem: NavItem | null;
  onNavigate: (item: NavItem) => void;
  queueCount: number;
  subscriptionCount: number;
}

export function TopNav({ activeItem, onNavigate, queueCount, subscriptionCount }: TopNavProps) {
  const { hasOpenSheet } = useSheetContext();

  return (
    <nav
      className={`${styles.nav} ${hasOpenSheet ? styles.hidden : ''}`}
      aria-label="Hovednavigasjon"
    >
      {/* Logo - only visible on desktop when nav is at top */}
      <div className={styles.logo}>
        <HeadphonesIcon size={24} className={styles.logoIcon} aria-hidden="true" />
        <span className={styles.logoText}>Lyttejeger</span>
      </div>

      <div className={styles.navItems}>
        <button
          className={`${styles.navItem} ${activeItem === 'search' ? styles.active : ''}`}
          onClick={() => onNavigate('search')}
          aria-current={activeItem === 'search' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <SearchIcon size={24} aria-hidden="true" />
          </span>
          <span className={styles.label}>Søk</span>
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'home' ? styles.active : ''}`}
          onClick={() => onNavigate('home')}
          aria-current={activeItem === 'home' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <ClockIcon size={24} aria-hidden="true" />
          </span>
          <span className={styles.label}>Nyeste</span>
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'subscriptions' ? styles.active : ''}`}
          onClick={() => onNavigate('subscriptions')}
          aria-current={activeItem === 'subscriptions' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <HeartIcon size={24} aria-hidden="true" />
            {subscriptionCount > 0 && <span className={styles.badge}>{subscriptionCount}</span>}
          </span>
          <span className={styles.label}>Mine podder</span>
        </button>

        <button
          className={`${styles.navItem} ${activeItem === 'queue' ? styles.active : ''}`}
          onClick={() => onNavigate('queue')}
          aria-current={activeItem === 'queue' ? 'page' : undefined}
        >
          <span className={styles.iconWrapper}>
            <ListMusicIcon size={24} aria-hidden="true" />
            {queueCount > 0 && <span className={styles.badge}>{queueCount}</span>}
          </span>
          <span className={styles.label}>Min kø</span>
        </button>

        <InfoPopover triggerClassName={styles.navItem} />
      </div>
    </nav>
  );
}
