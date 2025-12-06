import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 6a6 6 0 0 0-6 6c0 3.31 2.69 6 6 6h.5" />
          <path d="M12 6a6 6 0 0 1 6 6c0 3.31-2.69 6-6 6" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <span className={styles.logoText}>Lyttejeger</span>
      </div>
      <p className={styles.tagline}>Finn din neste favorittpodcast</p>
    </header>
  )
}
