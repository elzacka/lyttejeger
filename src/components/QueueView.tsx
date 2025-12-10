import type { QueueItem } from '../services/db'
import { formatDuration } from '../utils/search'
import styles from './QueueView.module.css'

interface QueueViewProps {
  queue: QueueItem[]
  onPlay: (item: QueueItem) => void
  onRemove: (id: number) => void
  onClear: () => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function QueueView({
  queue,
  onPlay,
  onRemove,
  onClear,
  onMoveUp,
  onMoveDown,
}: QueueViewProps) {
  if (queue.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>Køen er tom</h3>
        <p>Legg til episoder fra søkeresultatene eller en podcast-side</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className="material-symbols-outlined" aria-hidden="true">queue_music</span>
          Avspillingskø
        </h2>
        <button
          className={styles.clearButton}
          onClick={onClear}
          aria-label="Tøm køen"
        >
          <span className="material-symbols-outlined">delete_sweep</span>
          Tøm
        </button>
      </div>

      <p className={styles.count}>{queue.length} {queue.length === 1 ? 'episode' : 'episoder'}</p>

      <ul className={styles.list} role="list">
        {queue.map((item, index) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.topRow}>
              <div className={styles.position}>{index + 1}</div>

              <div className={styles.imageContainer}>
                {(item.imageUrl || item.podcastImage) && (
                  <img
                    src={item.imageUrl || item.podcastImage}
                    alt=""
                    className={styles.image}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/favicon.svg'
                    }}
                  />
                )}
              </div>

              <div className={styles.content}>
                <p className={styles.podcastName}>{item.podcastTitle}</p>
                <p className={styles.episodeTitle}>{item.title}</p>
                {item.duration && (
                  <p className={styles.duration}>{formatDuration(item.duration)}</p>
                )}
              </div>

              {/* Desktop actions - hidden on mobile */}
              <div className={styles.actionsDesktop}>
                <button
                  className={styles.actionButton}
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Flytt opp"
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => onMoveDown(index)}
                  disabled={index === queue.length - 1}
                  aria-label="Flytt ned"
                >
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => item.id && onRemove(item.id)}
                  aria-label="Fjern fra kø"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <button
                className={styles.playButton}
                onClick={() => onPlay(item)}
                aria-label={`Spill ${item.title}`}
              >
                <span className="material-symbols-outlined">play_arrow</span>
              </button>
            </div>

            {/* Mobile actions - shown at bottom */}
            <div className={styles.actionsMobile}>
              <button
                className={styles.actionButton}
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Flytt opp"
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
              <button
                className={styles.actionButton}
                onClick={() => onMoveDown(index)}
                disabled={index === queue.length - 1}
                aria-label="Flytt ned"
              >
                <span className="material-symbols-outlined">arrow_downward</span>
              </button>
              <button
                className={styles.actionButton}
                onClick={() => item.id && onRemove(item.id)}
                aria-label="Fjern fra kø"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
