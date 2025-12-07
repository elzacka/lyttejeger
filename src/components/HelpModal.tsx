import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import styles from './HelpModal.module.css'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={focusTrapRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <div className={styles.stickyHeader}>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className={styles.header}>
            <span className={`material-symbols-outlined ${styles.headerIcon}`} aria-hidden="true">text_ad</span>
            <h2 id="help-modal-title" className={styles.title}>Søketips</h2>
          </div>
        </div>

        <div className={styles.content}>
          <ul className={styles.tipList}>
            <li>
              <code>historie norge</code>
              <span>Alle ordene må finnes</span>
            </li>
            <li>
              <code>"hele historien"</code>
              <span>Finner nøyaktig denne teksten</span>
            </li>
            <li>
              <code>fotball OR håndball</code>
              <span>Finner ett av ordene</span>
            </li>
            <li>
              <code>krim -sport</code>
              <span>Utelater resultater med «sport»</span>
            </li>
            <li>
              <code>pod*</code>
              <span>Finner ord som starter med «pod»</span>
            </li>
            <li>
              <code>*krim*</code>
              <span>Finner ord som inneholder «krim»</span>
            </li>
            <li>
              <code>podkast</code>
              <span>Finner også lignende ord</span>
            </li>
            <li>
              <code>æøå</code>
              <span>Norske bokstaver fungerer</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
