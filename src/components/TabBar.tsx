import styles from './TabBar.module.css'

interface TabBarProps {
  activeTab: 'podcasts' | 'episodes'
  onTabChange: (tab: 'podcasts' | 'episodes') => void
  podcastCount: number
  episodeCount: number
}

export function TabBar({
  activeTab,
  onTabChange,
  podcastCount,
  episodeCount
}: TabBarProps) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.tab} ${activeTab === 'podcasts' ? styles.active : ''}`}
        onClick={() => onTabChange('podcasts')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 6a6 6 0 0 0-6 6c0 3.31 2.69 6 6 6h.5" />
          <path d="M12 6a6 6 0 0 1 6 6c0 3.31-2.69 6-6 6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <span>Podcaster</span>
        <span className={styles.count}>{podcastCount}</span>
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'episodes' ? styles.active : ''}`}
        onClick={() => onTabChange('episodes')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>Episoder</span>
        <span className={styles.count}>{episodeCount}</span>
      </button>
    </div>
  )
}
