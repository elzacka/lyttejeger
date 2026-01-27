import { useRef, useState, useCallback, useEffect } from 'react';
import styles from './YearRangeSlider.module.css';

interface YearRangeSliderProps {
  minYear: number;
  maxYear: number;
  fromYear: number | null;
  toYear: number | null;
  onChange: (fromYear: number, toYear: number) => void;
}

export function YearRangeSlider({
  minYear,
  maxYear,
  fromYear,
  toYear,
  onChange,
}: YearRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'from' | 'to' | null>(null);

  // Initialize with defaults if null
  const currentFromYear = fromYear ?? minYear;
  const currentToYear = toYear ?? maxYear;

  // Calculate positions (percentage from left)
  const totalYears = maxYear - minYear;
  const fromPercent = ((currentFromYear - minYear) / totalYears) * 100;
  const toPercent = ((currentToYear - minYear) / totalYears) * 100;

  // Convert clientX to year value with snapping
  const clientXToYear = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return minYear;

      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      const x = clientX - rect.left;

      // Calculate percentage from left
      const percent = Math.max(0, Math.min(1, x / trackWidth));
      const year = Math.round(minYear + percent * totalYears);

      return Math.max(minYear, Math.min(maxYear, year));
    },
    [minYear, maxYear, totalYears]
  );

  const handleDragStart = useCallback((handle: 'from' | 'to', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(handle);
  }, []);

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const year = clientXToYear(clientX);

      // Haptic feedback on year change
      if ('vibrate' in navigator) {
        const currentYear = isDragging === 'from' ? currentFromYear : currentToYear;
        if (year !== currentYear) {
          navigator.vibrate(10); // Short vibration pulse
        }
      }

      if (isDragging === 'from') {
        onChange(year, currentToYear);
      } else {
        onChange(currentFromYear, year);
      }
    },
    [isDragging, clientXToYear, currentFromYear, currentToYear, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Global mouse/touch event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      handleDragMove(e);
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className={styles.container}>
      <div className={styles.trackContainer}>
        <div ref={trackRef} className={styles.track}>
          {/* Year tick marks */}
          {Array.from({ length: totalYears + 1 }, (_, i) => {
            const year = minYear + i;
            const percent = (i / totalYears) * 100;
            return (
              <div
                key={year}
                className={styles.tick}
                style={{ left: `${percent}%` }}
              />
            );
          })}

          {/* Selected range highlight */}
          <div
            className={styles.range}
            style={{
              left: `${Math.min(fromPercent, toPercent)}%`,
              width: `${Math.abs(toPercent - fromPercent)}%`,
            }}
          />

          {/* From handle */}
          <div
            className={`${styles.handle} ${isDragging === 'from' ? styles.handleDragging : ''}`}
            style={{ left: `${fromPercent}%` }}
            onMouseDown={(e) => handleDragStart('from', e)}
            onTouchStart={(e) => handleDragStart('from', e)}
            role="slider"
            aria-label="Fra år"
            aria-valuemin={minYear}
            aria-valuemax={maxYear}
            aria-valuenow={currentFromYear}
            tabIndex={0}
          >
            <div className={styles.handleLabel}>{currentFromYear}</div>
          </div>

          {/* To handle */}
          <div
            className={`${styles.handle} ${isDragging === 'to' ? styles.handleDragging : ''}`}
            style={{ left: `${toPercent}%` }}
            onMouseDown={(e) => handleDragStart('to', e)}
            onTouchStart={(e) => handleDragStart('to', e)}
            role="slider"
            aria-label="Til år"
            aria-valuemin={minYear}
            aria-valuemax={maxYear}
            aria-valuenow={currentToYear}
            tabIndex={0}
          >
            <div className={styles.handleLabel}>{currentToYear}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
