import { useState, useRef, useEffect } from 'react'
import styles from './SearchHelp.module.css'

const searchTips = [
  {
    example: 'fotball vålerenga',
    description: 'Finn resultater som inneholder begge ordene',
  },
  {
    example: 'krim OR krimjournalistikk',
    description: 'Finn resultater som inneholder minst ett av ordene',
  },
  {
    example: '"ki og klarspråk"',
    description: 'Søk etter en eksakt frase',
  },
  {
    example: 'politikk -nyheter',
    description: 'Utelukk resultater som inneholder et ord',
  },
  {
    example: 'helse OR trening kosthold',
    description: 'Kombiner flere søketyper i ett søk',
  },
  {
    example: '"true crime" -mord',
    description: 'Søk etter frase, men utelukk visse ord',
  },
]

export function SearchHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Vis søketips"
        title="Søketips"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          help_outline
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className={styles.dropdown} role="tooltip">
            <ul className={styles.list} role="list">
              {searchTips.map((tip, index) => (
                <li key={index} className={styles.item}>
                  <span className={styles.example}>{tip.example}</span>
                  <span className={styles.description}>{tip.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
