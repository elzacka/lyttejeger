import { useState, useEffect, useRef } from 'react';
import { InfoIcon } from './icons';
import styles from './InfoPopover.module.css';

interface InfoPopoverProps {
  triggerClassName?: string;
}

export function InfoPopover({ triggerClassName }: InfoPopoverProps) {
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
        className={`${styles.trigger} ${triggerClassName || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Vis info"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={styles.iconWrapper}>
          <InfoIcon size={24} aria-hidden="true" />
        </span>
        <span className={styles.label}>Info</span>
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Info">
          <div className={styles.header}>
            <h2 className={styles.title}>Info</h2>
          </div>
          <ul className={styles.links}>
            <li>
              <a
                href="https://podcastindex.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                onClick={() => setIsOpen(false)}
              >
                Data fra Podcast Index
              </a>
            </li>
            <li>
              <a
                href="https://github.com/elzacka/lyttejeger/blob/main/PRIVACY.md"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                onClick={() => setIsOpen(false)}
              >
                Personvern
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
