import { useEffect, useState, useRef } from 'react'
import type { Podcast, Episode } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { getEpisodesByFeedId } from '../services/podcastIndex'
import { transformEpisodes } from '../services/podcastTransform'
import { formatDuration, formatDateShort, formatDateLong, linkifyText } from '../utils/search'
import { translateCategory } from '../utils/categoryTranslations'
import styles from './PodcastPage.module.css'

interface PodcastPageProps {
  podcast: Podcast
  onPlayEpisode: (episode: PlayingEpisode) => void
  onAddToQueue?: (episode: Episode, podcastTitle: string, podcastImage: string) => void
  onPlayNext?: (episode: Episode, podcastTitle: string, podcastImage: string) => void
  isInQueue?: (episodeId: string) => boolean
  isSubscribed?: boolean
  onSubscribe?: () => void
  onUnsubscribe?: () => void
}

export function PodcastPage({ podcast, onPlayEpisode, onAddToQueue, onPlayNext, isInQueue, isSubscribed, onSubscribe, onUnsubscribe }: PodcastPageProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [episodesError, setEpisodesError] = useState<string | null>(null)
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenId) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const fetchEpisodes = async () => {
      setIsLoadingEpisodes(true)
      setEpisodesError(null)

      try {
        const feedId = parseInt(podcast.id)
        if (isNaN(feedId)) {
          throw new Error('Invalid podcast ID')
        }

        const res = await getEpisodesByFeedId(feedId, 50)
        const transformedEpisodes = transformEpisodes(res.items || [])
        setEpisodes(transformedEpisodes)
      } catch {
        setEpisodesError('Kunne ikke hente episodene. Prøv igjen.')
      } finally {
        setIsLoadingEpisodes(false)
      }
    }

    fetchEpisodes()
  }, [podcast.id])

  const handlePlayEpisode = (episode: Episode) => {
    onPlayEpisode({
      ...episode,
      podcastTitle: podcast.title,
      podcastImage: podcast.imageUrl
    })
  }

  const toggleEpisodeExpand = (episodeId: string) => {
    setExpandedEpisodeId(prev => prev === episodeId ? null : episodeId)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={`material-symbols-outlined ${styles.logoIcon}`} aria-hidden="true">earbuds</span>
          <span className={styles.logoText}>Lyttejeger</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.podcastInfo}>
          {imageError ? (
            <div className={`${styles.image} image-placeholder`}>
              <span className="material-symbols-outlined" aria-hidden="true">podcasts</span>
            </div>
          ) : (
            <img
              src={podcast.imageUrl}
              alt={`Omslagsbilde for ${podcast.title}`}
              className={styles.image}
              onError={() => setImageError(true)}
            />
          )}
          <div className={styles.infoContent}>
            <h2 className={styles.title}>{podcast.title}</h2>
            <p className={styles.author}>{podcast.author}</p>
            <div className={styles.rating}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--warning-color)' }}>star</span>
              <span>{podcast.rating.toFixed(1)}</span>
            </div>
            {podcast.explicit && <span className={styles.explicitBadge}>Eksplisitt</span>}
            {(onSubscribe || onUnsubscribe) && (
              <button
                className={`${styles.subscribeButton} ${isSubscribed ? styles.subscribed : ''}`}
                onClick={isSubscribed ? onUnsubscribe : onSubscribe}
                aria-pressed={isSubscribed}
              >
                {isSubscribed ? 'Følger' : 'Følg'}
              </button>
            )}
          </div>
        </section>

        <section className={styles.description}>
          <p>{podcast.description}</p>
        </section>

        <section className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Episoder</span>
            <span className={styles.metaValue}>{podcast.episodeCount}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Sist oppdatert</span>
            <span className={styles.metaValue}>{formatDateShort(podcast.lastUpdated)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Språk</span>
            <span className={styles.metaValue}>{podcast.language}</span>
          </div>
        </section>

        <section className={styles.categories}>
          {podcast.categories.map((category) => (
            <span key={category} className={styles.category}>
              {translateCategory(category)}
            </span>
          ))}
        </section>

        <section className={styles.episodesSection}>
          <h3 className={styles.episodesTitle}>Episoder</h3>

          {isLoadingEpisodes && (
            <div className={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonItem}>
                  <div className={`skeleton ${styles.skeletonTitle}`} />
                  <div className={`skeleton ${styles.skeletonMeta}`} />
                </div>
              ))}
            </div>
          )}

          {episodesError && (
            <p className={styles.error}>{episodesError}</p>
          )}

          {!isLoadingEpisodes && !episodesError && episodes.length === 0 && (
            <p className={styles.noEpisodes}>Fant ingen episoder</p>
          )}

          {!isLoadingEpisodes && episodes.length > 0 && (
            <ul className={styles.episodeList}>
              {episodes.map((episode) => {
                const isExpanded = expandedEpisodeId === episode.id
                const isMenuOpen = menuOpenId === episode.id
                return (
                  <li key={episode.id} className={`${styles.episodeItem} ${isMenuOpen ? styles.menuOpen : ''}`}>
                    <div className={styles.episodeHeader}>
                      <button
                        className={styles.episodeToggle}
                        onClick={() => toggleEpisodeExpand(episode.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`episode-details-${episode.id}`}
                      >
                        <span className={`material-symbols-outlined ${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                          expand_more
                        </span>
                        <div className={styles.episodeInfo}>
                          <p className={styles.episodeTitle}>{episode.title}</p>
                          <div className={styles.episodeMeta}>
                            <span>{formatDateLong(episode.publishedAt)}</span>
                            {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
                          </div>
                        </div>
                      </button>
                      {onAddToQueue && (
                        <div className={styles.menuContainer} ref={menuOpenId === episode.id ? menuRef : null}>
                          <button
                            className={styles.menuButton}
                            onClick={() => setMenuOpenId(menuOpenId === episode.id ? null : episode.id)}
                            aria-label="Flere valg"
                            aria-expanded={menuOpenId === episode.id}
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                          {menuOpenId === episode.id && (
                            <div className={styles.menuDropdown}>
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  onPlayNext?.(episode, podcast.title, podcast.imageUrl)
                                  setMenuOpenId(null)
                                }}
                              >
                                <span className="material-symbols-outlined">playlist_play</span>
                                Spill neste
                              </button>
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  onAddToQueue(episode, podcast.title, podcast.imageUrl)
                                  setMenuOpenId(null)
                                }}
                                disabled={isInQueue?.(episode.id)}
                              >
                                <span className="material-symbols-outlined">queue_music</span>
                                {isInQueue?.(episode.id) ? 'I køen' : 'Legg til i kø'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        className={styles.playButton}
                        onClick={() => handlePlayEpisode(episode)}
                        aria-label={`Spill ${episode.title}`}
                      >
                        <span className="material-symbols-outlined">play_arrow</span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div
                        id={`episode-details-${episode.id}`}
                        className={styles.episodeDetails}
                      >
                        {episode.description ? (
                          <p className={styles.episodeDescription}>
                            {linkifyText(episode.description).map((part, idx) =>
                              part.type === 'link' ? (
                                <a
                                  key={idx}
                                  href={part.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.descriptionLink}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {part.content}
                                </a>
                              ) : (
                                <span key={idx}>{part.content}</span>
                              )
                            )}
                          </p>
                        ) : (
                          <p className={styles.noDescription}>Ingen beskrivelse tilgjengelig</p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
