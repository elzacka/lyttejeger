import { useState, useEffect, useRef } from 'react';
import { HelpCircle as HelpCircleIcon } from 'lucide-react';
import styles from './SearchHelp.module.css';

const searchTips = [
  {
    example: 'fotball vålerenga',
    description: 'Begge ordene må finnes',
  },
  {
    example: 'krim OR horror',
    description: 'Minst ett av ordene må finnes',
  },
  {
    example: '"true crime"',
    description: 'Eksakt frase',
  },
  {
    example: 'politikk -nyheter',
    description: 'Politikk, men ikke nyheter',
  },
  {
    example: '"true crime" -mord',
    description: 'Eksakt frase uten mord',
  },
];

export function SearchHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Vis søketips"
        aria-expanded={isOpen}
        title="Søketips"
      >
        <HelpCircleIcon size={18} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Søketips">
          <div className={styles.header}>
            <h2 className={styles.title}>Søketips</h2>
          </div>
          <ul className={styles.list} role="list">
            {searchTips.map((tip) => (
              <li key={tip.example} className={styles.item}>
                <span className={styles.example}>{tip.example}</span>
                <span className={styles.description}>{tip.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
