import { useEffect, useRef, useCallback, useId, useState, type ReactNode } from 'react'
import { useSheetContext } from '../hooks/useSheetContext'
import styles from './Sheet.module.css'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  ariaLabel?: string
}

const DRAG_THRESHOLD = 100
const VELOCITY_THRESHOLD = 0.5
const DESKTOP_BREAKPOINT = 641

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  ariaLabel,
}: SheetProps) {
  const sheetId = useId()
  const { registerSheet, unregisterSheet } = useSheetContext()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < DESKTOP_BREAKPOINT : true
  )
  const dragRef = useRef({
    startY: 0,
    currentY: 0,
    startTime: 0,
    isDragging: false,
  })

  // Track viewport size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < DESKTOP_BREAKPOINT)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Register/unregister sheet with context (only on mobile)
  useEffect(() => {
    if (isOpen && isMobile) {
      registerSheet(sheetId)
      return () => unregisterSheet(sheetId)
    }
  }, [isOpen, isMobile, sheetId, registerSheet, unregisterSheet])

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
      onClose()
    }

    dragRef.current.isDragging = false
  }, [onClose])

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

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Lock body scroll when open (only on mobile)
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isMobile])

  if (!isOpen) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
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

        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
          </div>
        )}

        <div className={styles.content}>{children}</div>
      </div>
    </>
  )
}
