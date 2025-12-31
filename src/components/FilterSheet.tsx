import { useEffect, useRef, useCallback, useId, useState, type ReactNode } from 'react'
import { useSheetContext } from '../hooks/useSheetContext'
import { useFocusTrap } from '../hooks/useFocusTrap'
import styles from './FilterSheet.module.css'

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
}

const DRAG_THRESHOLD = 100
const VELOCITY_THRESHOLD = 0.5

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
  const sheetId = useId()
  const titleId = useId()
  const { registerSheet, unregisterSheet } = useSheetContext()
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isClosing, setIsClosing] = useState(false)

  // Apply focus trap to sheet when open
  useFocusTrap(sheetRef, isOpen && !isClosing)
  const dragRef = useRef({
    startY: 0,
    currentY: 0,
    startTime: 0,
    isDragging: false,
  })

  // Register/unregister sheet with context
  useEffect(() => {
    if (isOpen) {
      registerSheet(sheetId)
      return () => unregisterSheet(sheetId)
    }
  }, [isOpen, sheetId, registerSheet, unregisterSheet])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }, [onClose])

  const handleDragStart = useCallback((clientY: number) => {
    dragRef.current = {
      startY: clientY,
      currentY: clientY,
      startTime: Date.now(),
      isDragging: true,
    }
  }, [])

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return

    const deltaY = clientY - dragRef.current.startY
    dragRef.current.currentY = clientY

    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging || !sheetRef.current) return

    const deltaY = dragRef.current.currentY - dragRef.current.startY
    const deltaTime = Date.now() - dragRef.current.startTime
    const velocity = deltaY / deltaTime

    sheetRef.current.style.transition = ''
    sheetRef.current.style.transform = ''

    if (deltaY > DRAG_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      handleClose()
    }

    dragRef.current.isDragging = false
  }, [handleClose])

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY)
    },
    [handleDragStart]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY)
    },
    [handleDragMove]
  )

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Mouse events for desktop testing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY)
    },
    [handleDragStart]
  )

  useEffect(() => {
    if (!dragRef.current.isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleDragMove, handleDragEnd])

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus search input when sheet opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      // Small delay to ensure sheet animation completes
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, searchable])

  if (!isOpen) return null

  return (
    <>
      <div
        className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${isClosing ? styles.sheetClosing : ''}`}
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
          aria-hidden="true"
        >
          <div className={styles.dragIndicator} />
        </div>

        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button
            className={styles.doneButton}
            onClick={handleClose}
            type="button"
          >
            Ferdig
          </button>
        </div>

        {searchable && (
          <div className={styles.searchContainer}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`} aria-hidden="true">
              search
            </span>
            <input
              ref={searchInputRef}
              type="search"
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
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        )}

        <div className={styles.content}>{children}</div>
      </div>
    </>
  )
}
