import { useState } from 'react'
import { Sheet } from './Sheet'
import styles from './SearchHelp.module.css'

const searchTips = [
  {
    example: 'fotball vålerenga',
    description: 'Treff der både fotball og Vålerenga er nevnt',
  },
  {
    example: 'krim OR true crime',
    description: 'Krim eller True Crime',
  },
  {
    example: '"true crime"',
    description: 'Eksakt frase',
  },
  {
    example: 'politikk -nyheter',
    description: 'Treff på politikk, men ikke der nyheter er nevnt',
  },
  {
    example: '"true crime" -mord',
    description: 'Eksakt frase, men ikke der mord er nevnt',
  },
]

export function SearchHelp() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
        aria-label="Vis søketips"
        title="Søketips"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          help_outline
        </span>
      </button>

      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Søketips">
        <ul className={styles.list} role="list">
          {searchTips.map((tip, index) => (
            <li key={index} className={styles.item}>
              <span className={styles.example}>{tip.example}</span>
              <span className={styles.description}>{tip.description}</span>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  )
}
