/**
 * SkipLink - Accessibility component for keyboard navigation
 *
 * Allows keyboard users to skip directly to main content,
 * bypassing navigation and headers.
 *
 * WCAG 2.2 Success Criterion 2.4.1 (Level A): Bypass Blocks
 */

import styles from './SkipLink.module.css';

export function SkipLink() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      Hopp til hovedinnhold
    </a>
  );
}
