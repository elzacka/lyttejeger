import { useEffect, useRef, useCallback, useId, useState, type ReactNode } from 'react';
import { SearchIcon, CloseIcon } from './icons';
import { useSheetContext } from '../hooks/useSheetContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './FilterSheet.module.css';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const DRAG_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

export function FilterSheet({
  isOpen,
  onClose,
  title,
  children,
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
  });

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
    dragRef.current = {
      startY: clientY,
      currentY: clientY,
      startTime: Date.now(),
      isDragging: true,
    };
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;

    const deltaY = clientY - dragRef.current.startY;
    dragRef.current.currentY = clientY;

    // Only allow downward drag
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;

    const deltaY = dragRef.current.currentY - dragRef.current.startY;
    const deltaTime = Date.now() - dragRef.current.startTime;
    const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;

    sheetRef.current.style.transition = '';
    sheetRef.current.style.transform = '';

    if (deltaY > DRAG_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      handleClose();
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
      <div
        className={styles.backdrop}
        onClick={handleClose}
        onTouchEnd={handleClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={styles.sheet}
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
