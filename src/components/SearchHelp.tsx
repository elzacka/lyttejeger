import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Update popover position when opened or window resizes
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px gap (var(--space-2))
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
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
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Vis søketips"
        aria-expanded={isOpen}
        title="Søketips"
      >
        <HelpCircleIcon size={18} aria-hidden="true" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.popover}
            role="dialog"
            aria-label="Søketips"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              right: `${position.right}px`,
            }}
          >
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
          </div>,
          document.body
        )}
    </>
  );
}
