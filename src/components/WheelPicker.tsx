import { useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './WheelPicker.module.css';

interface WheelPickerProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
}

// Must match CSS height - use 36 (--button-sm) for desktop, mobile uses 26px
const ITEM_HEIGHT = 36;

export function WheelPicker({ options, value, onChange, placeholder = 'Alle' }: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Include placeholder option at the start - memoize to prevent re-creation
  const allOptions = useMemo(
    () => [{ value: '', label: placeholder }, ...options],
    [options, placeholder]
  );

  // Find current index
  const currentIndex =
    value === null || value === '' ? 0 : allOptions.findIndex((opt) => opt.value === value);

  // Scroll to selected item on mount and value change
  useEffect(() => {
    if (scrollRef.current && !isScrollingRef.current) {
      const targetScroll = currentIndex * ITEM_HEIGHT;
      scrollRef.current.scrollTop = targetScroll;
    }
  }, [currentIndex]);

  // Handle scroll with snap
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Snap to nearest item after scroll ends
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!scrollRef.current) return;

      const scroll = scrollRef.current.scrollTop;
      const nearestIndex = Math.round(scroll / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(nearestIndex, allOptions.length - 1));
      const targetScroll = clampedIndex * ITEM_HEIGHT;

      isScrollingRef.current = true;
      scrollRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      setTimeout(() => {
        isScrollingRef.current = false;
        const selectedOption = allOptions[clampedIndex];
        if (selectedOption) {
          onChange(selectedOption.value === '' ? null : selectedOption.value);
        }
      }, 150);
    }, 80);
  }, [allOptions, onChange]);

  // Navigate to previous/next item
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const selectedOption = allOptions[newIndex];
      if (selectedOption) {
        onChange(selectedOption.value === '' ? null : selectedOption.value);
      }
    }
  }, [currentIndex, allOptions, onChange]);

  const goToNext = useCallback(() => {
    if (currentIndex < allOptions.length - 1) {
      const newIndex = currentIndex + 1;
      const selectedOption = allOptions[newIndex];
      if (selectedOption) {
        onChange(selectedOption.value === '' ? null : selectedOption.value);
      }
    }
  }, [currentIndex, allOptions, onChange]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.spinner}>
      {/* Up arrow */}
      <button
        type="button"
        className={styles.arrowButton}
        onClick={goToPrev}
        disabled={currentIndex === 0}
        aria-label="Forrige"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          keyboard_arrow_up
        </span>
      </button>

      {/* Scrollable wheel showing single item */}
      <div ref={scrollRef} className={styles.wheel} onScroll={handleScroll}>
        {allOptions.map((option, index) => (
          <div
            key={option.value === '' ? '__placeholder__' : option.value}
            className={`${styles.item} ${index === currentIndex ? styles.itemSelected : ''}`}
            role="option"
            aria-selected={index === currentIndex}
          >
            {option.label}
          </div>
        ))}
      </div>

      {/* Down arrow */}
      <button
        type="button"
        className={styles.arrowButton}
        onClick={goToNext}
        disabled={currentIndex === allOptions.length - 1}
        aria-label="Neste"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>
    </div>
  );
}
