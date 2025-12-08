import { useRef } from 'react'
import styles from './SearchBar.module.css'
import { SearchHelp } from './SearchHelp'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isPending?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Søk...',
  isPending = false
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Søkefelt for podcaster og episoder"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          lang="no"
        />
        <div className={styles.actions}>
          {isPending && (
            <div className={styles.spinner} aria-label="Søker...">
              <span className={`material-symbols-outlined ${styles.spinnerIcon}`}>progress_activity</span>
            </div>
          )}
          {value && !isPending && (
            <button
              className={styles.clearButton}
              onClick={() => onChange('')}
              aria-label="Tøm søkefeltet"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
          <SearchHelp />
        </div>
      </div>
    </div>
  )
}
