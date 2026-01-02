import { useEffect, useRef, useCallback, useId, useState, type ReactNode } from 'react';
import { SearchIcon, CloseIcon } from './icons';
import { useSheetContext } from '../hooks/useSheetContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './FilterSheet.module.css';

type SheetSize = 'small' | 'medium' | 'large' | 'full';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: SheetSize;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const VELOCITY_THRESHOLD = 0.5;

// Snap points for sheet heights (percentage of viewport)
const SNAP_POINTS = [0.25, 0.5, 0.75, 1.0]; // 25%, 50%, 75%, 100%

function findNearestSnapPoint(heightPercent: number): number {
  let nearest = SNAP_POINTS[0];
  let minDiff = Math.abs(heightPercent - nearest);
  for (const point of SNAP_POINTS) {
    const diff = Math.abs(heightPercent - point);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }
  return nearest;
}

export function FilterSheet({
  isOpen,
  onClose,
  title,
  children,
  size = 'full',
  searchable = false,
  searchPlaceholder = 'Søk...',
  searchValue = '',
  onSearchChange,
}: FilterSheetProps) {
  const sheetId = useId();
  const titleId = useId();
  const { registerSheet, unregisterSheet } = useSheetContext();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setSheetHeight] = useState<number | null>(null);

  useFocusTrap(sheetRef, isOpen && !isClosing);

  const dragRef = useRef({
    startY: 0,
    currentY: 0,
    startTime: 0,
    isDragging: false,
    startHeight: 0,
  });

  // Reset height when sheet opens
  useEffect(() => {
    if (isOpen) {
      setSheetHeight(null);
    }
  }, [isOpen]);

  // Register/unregister sheet with context
  useEffect(() => {
    if (isOpen) {
      registerSheet(sheetId);
      return () => unregisterSheet(sheetId);
    }
  }, [isOpen, sheetId, registerSheet, unregisterSheet]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return; // Prevent double-click
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose, isClosing]);

  const handleDragStart = useCallback((clientY: number) => {
    // Don't start drag if content is scrolled
    if (contentRef.current && contentRef.current.scrollTop > 0) {
      return;
    }
    const currentHeight = sheetRef.current?.offsetHeight || window.innerHeight * 0.75;
    dragRef.current = {
      startY: clientY,
      currentY: clientY,
      startTime: Date.now(),
      isDragging: true,
      startHeight: currentHeight,
    };
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;

    const deltaY = clientY - dragRef.current.startY;
    dragRef.current.currentY = clientY;

    // Calculate new height (dragging up = negative deltaY = increase height)
    const newHeight = dragRef.current.startHeight - deltaY;
    const viewportHeight = window.innerHeight;
    const minHeight = viewportHeight * 0.25;
    const maxHeight = viewportHeight;

    // Clamp height between min and max
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    sheetRef.current.style.height = `${clampedHeight}px`;
    sheetRef.current.style.maxHeight = `${clampedHeight}px`;
    sheetRef.current.style.transition = 'none';
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;

    const deltaY = dragRef.current.currentY - dragRef.current.startY;
    const deltaTime = Date.now() - dragRef.current.startTime;
    const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;
    const viewportHeight = window.innerHeight;

    // If dragged down fast or far, close
    if (deltaY > 150 || velocity > VELOCITY_THRESHOLD) {
      sheetRef.current.style.height = '';
      sheetRef.current.style.maxHeight = '';
      sheetRef.current.style.transition = '';
      handleClose();
    } else {
      // Snap to nearest snap point
      const currentHeight = sheetRef.current.offsetHeight;
      const heightPercent = currentHeight / viewportHeight;
      const snapPoint = findNearestSnapPoint(heightPercent);
      const snapHeight = snapPoint * viewportHeight;

      sheetRef.current.style.transition = 'height 0.2s ease-out, max-height 0.2s ease-out';
      sheetRef.current.style.height = `${snapHeight}px`;
      sheetRef.current.style.maxHeight = `${snapHeight}px`;
      setSheetHeight(snapHeight);

      // Clear transition after animation
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
        }
      }, 200);
    }

    dragRef.current.isDragging = false;
  }, [handleClose]);

  // Touch events - only on drag handle
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragRef.current.isDragging) {
        e.preventDefault(); // Prevent scroll only during drag
      }
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse events for desktop testing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);
    },
    [handleDragStart]
  );

  // Global mouse events during drag
  useEffect(() => {
    const isDragging = dragRef.current.isDragging;
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleDragMove, handleDragEnd]);

  // Escape key handling
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isClosing, handleClose]);

  // Body scroll lock with iOS fix
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Focus search input when sheet opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 250); // Wait for animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`${styles.container} ${isClosing ? styles.containerClosing : ''}`}
      role="presentation"
    >
      <div className={styles.backdrop} onClick={handleClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${styles[`size${size.charAt(0).toUpperCase()}${size.slice(1)}`]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={styles.dragHandle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Dra for å lukke"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClose();
            }
          }}
        >
          <div className={styles.dragIndicator} />
        </div>

        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button className={styles.doneButton} onClick={handleClose} type="button">
            Ferdig
          </button>
        </div>

        {searchable && (
          <div className={styles.searchContainer}>
            <SearchIcon size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label={searchPlaceholder}
            />
            {searchValue && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => onSearchChange?.('')}
                aria-label="Tøm søk"
              >
                <CloseIcon size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div ref={contentRef} className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
