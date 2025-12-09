import { useEffect, useRef } from 'react'
import styles from './InfoSheet.module.css'

interface InfoSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoSheet({ isOpen, onClose }: InfoSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

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

  if (!isOpen) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-label="Informasjon"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Om Lyttejeger</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.content}>
          <a
            href="https://podcastindex.org/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            <span className="material-symbols-outlined">database</span>
            Data fra Podcast Index
          </a>
          <a
            href="https://github.com/elzacka/lyttejeger/blob/main/PRIVACY.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            <span className="material-symbols-outlined">shield</span>
            Personvern
          </a>
        </div>
      </div>
    </>
  )
}
