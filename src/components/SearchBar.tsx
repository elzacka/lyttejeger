import { useRef, useState, useCallback } from 'react';
import { SpinnerIcon, CloseIcon } from '@designsystem/core';
import styles from './SearchBar.module.css';
import { SearchHelp } from './SearchHelp';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isPending?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Søk...',
  isPending = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isIOS = typeof navigator !== 'undefined' && /iP(ad|hone|od)/.test(navigator.userAgent);
  // Use inputMode toggle to suppress iOS keyboard accessory bar
  const initialInputMode: 'none' | 'search' = isIOS ? 'none' : 'search';
  const [inputMode, setInputMode] = useState<'none' | 'search'>(initialInputMode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Blur input to dismiss keyboard on submit
    inputRef.current?.blur();
  };

  const handleFocus = useCallback(() => {
    if (!isIOS) {
      setInputMode('search');
      return;
    }

    setInputMode('none');
    requestAnimationFrame(() => setInputMode('search'));
  }, [isIOS]);

  const handleBlur = useCallback(() => {
    // Reset to the platform-appropriate default before next focus
    setInputMode(initialInputMode);
  }, [initialInputMode]);

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
          type="text"
          id="podcast-search-input"
          name="podcast-search-query"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label="Søkefelt for podcaster og episoder"
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode={inputMode}
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
          lang="no"
        />
        <div className={styles.actions}>
          {isPending && (
            <div className={styles.spinner} aria-label="Søker...">
              <SpinnerIcon size={20} className={styles.spinnerIcon} />
            </div>
          )}
          {value && !isPending && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => onChange('')}
              aria-label="Tøm søkefeltet"
            >
              <CloseIcon size={20} />
            </button>
          )}
          <SearchHelp />
        </div>
      </div>
    </form>
  );
}
