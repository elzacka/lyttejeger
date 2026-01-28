/**
 * Sleep timer hook for audio player
 * Handles countdown timer and end-of-episode sleep options
 */

import { useState, useCallback, useEffect } from 'react';

// Sleep timer options (in minutes, 0 = off, -1 = end of episode)
export const SLEEP_TIMER_OPTIONS = [
  { value: 0, label: 'Av' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 time' },
  { value: -1, label: 'Slutten' },
] as const;

export interface UseSleepTimerReturn {
  sleepTimerMinutes: number;
  sleepTimerEnd: number | null;
  cycleSleepTimer: () => void;
  formatSleepTimerRemaining: () => string | null;
  resetSleepTimer: () => void;
}

export function useSleepTimer(
  isPlaying: boolean,
  onTimerExpired: () => void
): UseSleepTimerReturn {
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);

  // Sleep timer logic
  useEffect(() => {
    if (!sleepTimerEnd || !isPlaying) return;

    const checkTimer = () => {
      const now = Date.now();
      if (now >= sleepTimerEnd) {
        onTimerExpired();
        setSleepTimerEnd(null);
        setSleepTimerMinutes(0);
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd, isPlaying, onTimerExpired]);

  // Cycle through sleep timer options
  const cycleSleepTimer = useCallback(() => {
    const currentIndex = SLEEP_TIMER_OPTIONS.findIndex((opt) => opt.value === sleepTimerMinutes);
    const nextIndex = (currentIndex + 1) % SLEEP_TIMER_OPTIONS.length;
    const nextOption = SLEEP_TIMER_OPTIONS[nextIndex];

    setSleepTimerMinutes(nextOption.value);

    if (nextOption.value === 0) {
      setSleepTimerEnd(null);
    } else if (nextOption.value === -1) {
      // End of episode - handled by parent component
      setSleepTimerEnd(null);
    } else {
      setSleepTimerEnd(Date.now() + nextOption.value * 60 * 1000);
    }
  }, [sleepTimerMinutes]);

  // Format remaining time for display
  const formatSleepTimerRemaining = useCallback(() => {
    if (sleepTimerMinutes === 0) return null;
    if (sleepTimerMinutes === -1) return 'Slutten';
    if (!sleepTimerEnd) return null;

    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.ceil(remaining / 60000);
    return `${mins} min`;
  }, [sleepTimerMinutes, sleepTimerEnd]);

  // Reset timer
  const resetSleepTimer = useCallback(() => {
    setSleepTimerEnd(null);
    setSleepTimerMinutes(0);
  }, []);

  return {
    sleepTimerMinutes,
    sleepTimerEnd,
    cycleSleepTimer,
    formatSleepTimerRemaining,
    resetSleepTimer,
  };
}
