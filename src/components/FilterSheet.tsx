import { useEffect, useRef, useId, useState, type ReactNode } from 'react';
import { Search as SearchIcon, X as CloseIcon } from 'lucide-react';
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

  useFocusTrap(sheetRef, isOpen && !isClosing);

  const dragRef = useRef({
    startY: 0,
    currentY: 0,
    startTime: 0,
    isDragging: false,
    startHeight: 0,
  });

  // Reset inline styles when sheet opens (clear any drag-set heights)
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.height = '';
      sheetRef.current.style.maxHeight = '';
      sheetRef.current.style.transition = '';
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

  const handleClose = () => {
    if (isClosing) return; // Prevent double-click
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleDragStart = (clientY: number) => {
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
  };

  const handleDragMove = (clientY: number) => {
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
  };

  const handleDragEnd = () => {
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

      // Clear transition after animation
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
        }
      }, 200);
    }

    dragRef.current.isDragging = false;
  };

  // Touch events - only on drag handle
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragRef.current.isDragging) {
      e.preventDefault(); // Prevent scroll only during drag
    }
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  // Global mouse events during drag
  useEffect(() => {
    if (!dragRef.current.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging || !sheetRef.current) return;

      const deltaY = e.clientY - dragRef.current.startY;
      dragRef.current.currentY = e.clientY;

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
    };

    const handleMouseUp = () => {
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
        if (!isClosing) {
          setIsClosing(true);
          closeTimeoutRef.current = setTimeout(() => {
            setIsClosing(false);
            onClose();
          }, 200);
        }
      } else {
        // Snap to nearest snap point
        const currentHeight = sheetRef.current.offsetHeight;
        const heightPercent = currentHeight / viewportHeight;
        const snapPoint = findNearestSnapPoint(heightPercent);
        const snapHeight = snapPoint * viewportHeight;

        sheetRef.current.style.transition = 'height 0.2s ease-out, max-height 0.2s ease-out';
        sheetRef.current.style.height = `${snapHeight}px`;
        sheetRef.current.style.maxHeight = `${snapHeight}px`;

        // Clear transition after animation
        setTimeout(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = '';
          }
        }, 200);
      }

      dragRef.current.isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isClosing, onClose]);

  // Escape key handling
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isClosing) {
          setIsClosing(true);
          closeTimeoutRef.current = setTimeout(() => {
            setIsClosing(false);
            onClose();
          }, 200);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isClosing, onClose]);

  // Body scroll lock - modern approach without position: fixed
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;

    // Simply add the scroll-lock class (uses overflow: hidden, not position: fixed)
    body.classList.add('scroll-lock');

    return () => {
      // Remove lock when closing
      body.classList.remove('scroll-lock');
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
