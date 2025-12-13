import { Sheet } from './Sheet'
import styles from './InfoSheet.module.css'

interface InfoSheetProps {
  isOpen: boolean
  onClose: () => void
  showInstall?: boolean
  onInstallClick?: () => void
}

export function InfoSheet({ isOpen, onClose, showInstall, onInstallClick }: InfoSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Mer">
      <div className={styles.links}>
        {showInstall && onInstallClick && (
          <button
            className={styles.actionButton}
            onClick={onInstallClick}
          >
            Installer app
          </button>
        )}
        <a
          href="https://podcastindex.org/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Data fra Podcast Index
        </a>
        <a
          href="https://github.com/elzacka/lyttejeger/blob/main/PRIVACY.md"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Personvern
        </a>
      </div>
    </Sheet>
  )
}
