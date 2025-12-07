import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={`material-symbols-outlined ${styles.logoIcon}`} aria-hidden="true">earbuds</span>
        <span className={styles.logoText}>Lyttejeger</span>
      </div>
    </header>
  )
}
