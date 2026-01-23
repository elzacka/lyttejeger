import { useState, useEffect, useCallback } from 'react';
import { getAllPlaybackPositions, type PlaybackPosition } from '../services/db';

export interface PlaybackProgress {
  position: number;
  duration: number;
  progress: number; // 0-100
  completed: boolean;
}

export function usePlaybackProgress() {
  const [positions, setPositions] = useState<Map<string, PlaybackPosition>>(new Map());

  const refresh = useCallback(async () => {
    const data = await getAllPlaybackPositions();
    setPositions(data);
  }, []);

  // Load initial data and set up periodic refresh
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const data = await getAllPlaybackPositions();
      if (mounted) {
        setPositions(data);
      }
    };

    loadData();

    // Refresh every 10 seconds to catch updates from playing
    const interval = setInterval(loadData, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getProgress = useCallback(
    (episodeId: string): PlaybackProgress | null => {
      const pos = positions.get(episodeId);
      if (!pos || pos.duration === 0) return null;

      return {
        position: pos.position,
        duration: pos.duration,
        progress: Math.min(100, (pos.position / pos.duration) * 100),
        completed: pos.completed,
      };
    },
    [positions]
  );

  return { getProgress, refresh };
}
