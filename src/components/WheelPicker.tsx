import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './WheelPicker.module.css'

interface WheelPickerProps {
  options: { value: number | string; label: string }[]
  value: number | string | null
  onChange: (value: number | string | null) => void
  placeholder?: string
  height?: number
}

const ITEM_HEIGHT = 36
const VISIBLE_ITEMS = 5

export function WheelPicker({
  options,
  value,
  onChange,
  placeholder = 'Velg',
  height = ITEM_HEIGHT * VISIBLE_ITEMS
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<number | null>(null)

  // Include "none" option at the start
  const allOptions = [{ value: '', label: placeholder }, ...options]

  // Find current index
  const currentIndex = value === null || value === ''
    ? 0
    : allOptions.findIndex(opt => opt.value === value)

  // Scroll to selected item when opening
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const targetScroll = currentIndex * ITEM_HEIGHT
      scrollRef.current.scrollTop = targetScroll
      setScrollTop(targetScroll)
    }
  }, [isOpen, currentIndex])

  // Handle scroll with snap
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return

    const scroll = scrollRef.current.scrollTop
    setScrollTop(scroll)

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Snap to nearest item after scroll ends
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!scrollRef.current) return

      const nearestIndex = Math.round(scroll / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(nearestIndex, allOptions.length - 1))
      const targetScroll = clampedIndex * ITEM_HEIGHT

      isScrollingRef.current = true
      scrollRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      })

      setTimeout(() => {
        isScrollingRef.current = false
        const selectedOption = allOptions[clampedIndex]
        if (selectedOption) {
          onChange(selectedOption.value === '' ? null : selectedOption.value)
        }
      }, 150)
    }, 100)
  }, [allOptions, onChange])

  // Handle item click
  const handleItemClick = (index: number) => {
    if (!scrollRef.current) return

    isScrollingRef.current = true
    const targetScroll = index * ITEM_HEIGHT
    scrollRef.current.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    })

    setTimeout(() => {
      isScrollingRef.current = false
      const selectedOption = allOptions[index]
      if (selectedOption) {
        onChange(selectedOption.value === '' ? null : selectedOption.value)
      }
    }, 200)
  }

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Get display label
  const displayLabel = value === null || value === ''
    ? placeholder
    : options.find(opt => opt.value === value)?.label || String(value)

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value === null ? styles.placeholder : undefined}>
          {displayLabel}
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} style={{ height }}>
          <div className={styles.highlight} style={{ top: (height - ITEM_HEIGHT) / 2 }} />
          <div
            ref={scrollRef}
            className={styles.scroll}
            onScroll={handleScroll}
            style={{
              paddingTop: (height - ITEM_HEIGHT) / 2,
              paddingBottom: (height - ITEM_HEIGHT) / 2
            }}
          >
            {allOptions.map((option, index) => {
              const offset = scrollTop - index * ITEM_HEIGHT
              const centerOffset = (height - ITEM_HEIGHT) / 2
              const distanceFromCenter = Math.abs(offset + centerOffset)
              const scale = Math.max(0.8, 1 - distanceFromCenter / (height / 2) * 0.2)
              const opacity = Math.max(0.4, 1 - distanceFromCenter / (height / 2) * 0.6)

              return (
                <div
                  key={option.value}
                  className={styles.item}
                  style={{
                    transform: `scale(${scale})`,
                    opacity
                  }}
                  onClick={() => handleItemClick(index)}
                  role="option"
                  aria-selected={
                    (value === null && option.value === '') ||
                    value === option.value
                  }
                >
                  {option.label}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
