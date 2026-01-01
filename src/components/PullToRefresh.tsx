import { SpinnerIcon, RefreshIcon, ChevronIcon } from './icons';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import styles from './PullToRefresh.module.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, disabled = false }: PullToRefreshProps) {
  const { isRefreshing, pullDistance, isReady } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  });

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div className={styles.indicator} style={{ transform: `translateY(${pullDistance - 60}px)` }}>
      {isRefreshing ? (
        <SpinnerIcon size={24} className={styles.spinning} />
      ) : isReady ? (
        <ChevronIcon direction="down" size={24} />
      ) : (
        <RefreshIcon
          size={24}
          className={styles.icon}
          style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}
        />
      )}
    </div>
  );
}
