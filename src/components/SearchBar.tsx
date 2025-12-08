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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Blur input to dismiss keyboard on submit
    inputRef.current?.blur()
  }

  return (
    <form
      className={styles.container}
      onSubmit={handleSubmit}
      action=""
      role="search"
      autoComplete="off"
    >
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="search"
          id="podcast-search-input"
          name="podcast-search-query"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Søkefelt for podcaster og episoder"
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
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
              type="button"
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
    </form>
  )
}
