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
        <span className="material-symbols-outlined" aria-hidden="true">podcasts</span>
        <span>Podcaster</span>
        <span className={styles.count}>{podcastCount}</span>
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'episodes' ? styles.active : ''}`}
        onClick={() => onTabChange('episodes')}
      >
        <span className="material-symbols-outlined" aria-hidden="true">play_circle</span>
        <span>Episoder</span>
        <span className={styles.count}>{episodeCount}</span>
      </button>
    </div>
  )
}
