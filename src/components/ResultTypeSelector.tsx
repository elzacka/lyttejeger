import styles from './ResultTypeSelector.module.css';

interface ResultTypeSelectorProps {
  activeTab: 'podcasts' | 'episodes';
  onTabChange: (tab: 'podcasts' | 'episodes') => void;
}

export function ResultTypeSelector({ activeTab, onTabChange }: ResultTypeSelectorProps) {
  return (
    <div className={styles.container}>
      <label className={styles.option}>
        <input
          type="radio"
          name="resultType"
          checked={activeTab === 'podcasts'}
          onChange={() => onTabChange('podcasts')}
          className={styles.radio}
        />
        <span className={styles.label}>Podcaster</span>
      </label>
      <label className={styles.option}>
        <input
          type="radio"
          name="resultType"
          checked={activeTab === 'episodes'}
          onChange={() => onTabChange('episodes')}
          className={styles.radio}
        />
        <span className={styles.label}>Episoder</span>
      </label>
    </div>
  );
}
