import { useState, useRef, useEffect } from 'react'
import type { EpisodeWithPodcast } from '../utils/search'
import { formatDuration, formatDate } from '../utils/search'
import styles from './EpisodeCard.module.css'

interface EpisodeCardProps {
  episode: EpisodeWithPodcast
  onPlay?: (episode: EpisodeWithPodcast) => void
  onShowDetails?: (episode: EpisodeWithPodcast) => void
  onAddToQueue?: (episode: EpisodeWithPodcast) => void
  onPlayNext?: (episode: EpisodeWithPodcast) => void
  isInQueue?: boolean
}

export function EpisodeCard({
  episode,
  onPlay,
  onShowDetails,
  onAddToQueue,
  onPlayNext,
  isInQueue = false,
}: EpisodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const imageUrl = episode.imageUrl || episode.podcast?.imageUrl

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const playEpisode = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPlay) {
      onPlay(episode)
    } else if (episode.audioUrl) {
      window.open(episode.audioUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCardClick = () => {
    if (onShowDetails) {
      onShowDetails(episode)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onShowDetails) {
        onShowDetails(episode)
      }
    }
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToQueue?.(episode)
    setMenuOpen(false)
  }

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlayNext?.(episode)
    setMenuOpen(false)
  }

  return (
    <article
      className={styles.card}
      role="listitem"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`${episode.title}${episode.podcast ? ` fra ${episode.podcast.title}` : ''}`}
    >
      <div className={styles.imageContainer}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.svg'
            }}
          />
        )}
        <button
          className={styles.playOverlay}
          onClick={playEpisode}
          aria-label={`Spill ${episode.title}`}
        >
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.podcastInfo}>
          {episode.podcast && (
            <span className={styles.podcastName}>{episode.podcast.title}</span>
          )}
        </div>

        <h3 className={styles.title}>{episode.title}</h3>

        <p className={styles.description}>
          {episode.description.length > 150
            ? `${episode.description.slice(0, 150)}...`
            : episode.description}
        </p>

        <div className={styles.meta}>
          <span className={styles.date}>{formatDate(episode.publishedAt)}</span>
          {formatDuration(episode.duration) && (
            <>
              <span className={styles.separator}>•</span>
              <span className={styles.duration}>{formatDuration(episode.duration)}</span>
            </>
          )}
          {isInQueue && (
            <>
              <span className={styles.separator}>•</span>
              <span className={styles.inQueue}>I kø</span>
            </>
          )}
        </div>

        {(onAddToQueue || onPlayNext) && (
          <div className={styles.actions}>
            <button
              ref={buttonRef}
              className={styles.menuButton}
              onClick={handleMenuClick}
              aria-label="Flere valg"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>

            {menuOpen && (
              <div ref={menuRef} className={styles.menu} role="menu">
                {onPlayNext && (
                  <button
                    className={styles.menuItem}
                    onClick={handlePlayNext}
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined">queue_play_next</span>
                    Spill neste
                  </button>
                )}
                {onAddToQueue && !isInQueue && (
                  <button
                    className={styles.menuItem}
                    onClick={handleAddToQueue}
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined">playlist_add</span>
                    Legg i kø
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
