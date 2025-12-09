import styles from './TabBar.module.css'

export type TabType = 'podcasts' | 'episodes' | 'queue' | 'subscriptions'

interface TabBarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  podcastCount: number
  episodeCount: number
  queueCount: number
}

export function TabBar({
  activeTab,
  onTabChange,
  podcastCount,
  episodeCount,
  queueCount,
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
      <button
        className={`${styles.tab} ${activeTab === 'queue' ? styles.active : ''}`}
        onClick={() => onTabChange('queue')}
      >
        <span className="material-symbols-outlined" aria-hidden="true">queue_music</span>
        <span>Kø</span>
        <span className={styles.count}>{queueCount}</span>
      </button>
    </div>
  )
}
