import { useRef, useEffect, useCallback, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  // Use ref for pullDistance in callbacks to avoid circular dependency
  const pullDistanceRef = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (window.scrollY > 0) return;

      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || disabled || isRefreshing) return;
      if (window.scrollY > 0) {
        isPulling.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance - the further you pull, the harder it gets
        const resistance = Math.min(diff * 0.4, threshold * 1.5);
        pullDistanceRef.current = resistance;
        setPullDistance(resistance);

        if (diff > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, isRefreshing, threshold]
  );

  // Use ref-based pullDistance to avoid circular dependency
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;
    isPulling.current = false;

    const currentPullDistance = pullDistanceRef.current;

    if (currentPullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Hold at threshold during refresh

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, onRefresh, threshold]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    isReady: pullDistance >= threshold,
  };
}
