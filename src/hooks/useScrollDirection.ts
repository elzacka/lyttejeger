import { useState, useEffect, useRef } from 'react'

export type ScrollDirection = 'up' | 'down' | null

/**
 * Hook to detect scroll direction for hiding/showing UI elements
 * Returns 'down' when scrolling down (hide), 'up' when scrolling up (show)
 * Only triggers after a threshold to avoid jitter
 */
export function useScrollDirection(threshold = 10): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      // Don't hide at the very top of the page
      if (scrollY < 50) {
        setScrollDirection(null)
        lastScrollY.current = scrollY
        ticking.current = false
        return
      }

      const diff = scrollY - lastScrollY.current

      // Only update if scroll exceeds threshold
      if (Math.abs(diff) >= threshold) {
        setScrollDirection(diff > 0 ? 'down' : 'up')
        lastScrollY.current = scrollY
      }

      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrollDirection
}
