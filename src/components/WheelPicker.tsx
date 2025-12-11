import { useRef, useEffect, useCallback } from 'react'
import styles from './WheelPicker.module.css'

interface WheelPickerProps {
  options: { value: number | string; label: string }[]
  value: number | string | null
  onChange: (value: number | string | null) => void
  placeholder?: string
}

const ITEM_HEIGHT = 26
const VISIBLE_ITEMS = 5

export function WheelPicker({
  options,
  value,
  onChange,
  placeholder = 'Alle'
}: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<number | null>(null)

  // Include placeholder option at the start
  const allOptions = [{ value: '', label: placeholder }, ...options]

  // Find current index
  const currentIndex = value === null || value === ''
    ? 0
    : allOptions.findIndex(opt => opt.value === value)

  const height = ITEM_HEIGHT * VISIBLE_ITEMS

  // Scroll to selected item on mount and value change
  useEffect(() => {
    if (scrollRef.current && !isScrollingRef.current) {
      const targetScroll = currentIndex * ITEM_HEIGHT
      scrollRef.current.scrollTop = targetScroll
    }
  }, [currentIndex])

  // Handle scroll with snap
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Snap to nearest item after scroll ends
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!scrollRef.current) return

      const scroll = scrollRef.current.scrollTop
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
    }, 80)
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={styles.spinner} style={{ height }}>
      {/* Gradient overlays for fade effect */}
      <div className={styles.fadeTop} />
      <div className={styles.fadeBottom} />

      {/* Selection highlight */}
      <div className={styles.highlight} />

      {/* Scrollable wheel */}
      <div
        ref={scrollRef}
        className={styles.wheel}
        onScroll={handleScroll}
        style={{
          paddingTop: ITEM_HEIGHT,
          paddingBottom: ITEM_HEIGHT
        }}
      >
        {allOptions.map((option, index) => (
          <div
            key={option.value === '' ? '__placeholder__' : option.value}
            className={`${styles.item} ${index === currentIndex ? styles.itemSelected : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => handleItemClick(index)}
            role="option"
            aria-selected={index === currentIndex}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  )
}
