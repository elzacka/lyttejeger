import { useState, useEffect, useCallback } from 'react'
import type { Subscription } from '../services/db'
import type { Episode } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { getEpisodesByFeedIds } from '../services/podcastIndex'
import { transformEpisodes } from '../services/podcastTransform'
import { formatDuration, formatDateLong, linkifyText } from '../utils/search'
import styles from './RecentEpisodes.module.css'

interface RecentEpisodesProps {
  subscriptions: Subscription[]
  onPlayEpisode: (episode: PlayingEpisode) => void
  onAddToQueue: (episode: Episode, podcastTitle: string, podcastImage: string) => void
  onPlayNext: (episode: Episode, podcastTitle: string, podcastImage: string) => void
  isInQueue: (episodeId: string) => boolean
}

interface EpisodeWithSubscription extends Episode {
  subscription: Subscription
}

export function RecentEpisodes({
  subscriptions,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
}: RecentEpisodesProps) {
  const [episodes, setEpisodes] = useState<EpisodeWithSubscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null)

  const toggleEpisodeExpand = useCallback((episodeId: string) => {
    setExpandedEpisodeId(prev => prev === episodeId ? null : episodeId)
  }, [])

  const fetchRecentEpisodes = useCallback(async () => {
    if (subscriptions.length === 0) {
      setEpisodes([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      // Build subscription lookup map
      const subMap = new Map<string, Subscription>()
      const feedIds: number[] = []

      for (const sub of subscriptions) {
        const feedId = parseInt(sub.podcastId)
        if (!isNaN(feedId)) {
          feedIds.push(feedId)
          subMap.set(sub.podcastId, sub)
        }
      }

      // Fetch all episodes in a single API call (up to 200 feeds supported)
      // Use 'since' parameter to only fetch episodes from last 7 days
      const sinceTimestamp = Math.floor(sevenDaysAgo / 1000)
      const res = await getEpisodesByFeedIds(feedIds, { max: 100, since: sinceTimestamp })
      const transformed = transformEpisodes(res.items || [])

      // Filter to last 7 days and attach subscription info
      const allEpisodes: EpisodeWithSubscription[] = transformed
        .filter((ep) => {
          const pubDate = new Date(ep.publishedAt).getTime()
          return pubDate >= sevenDaysAgo
        })
        .map((ep) => {
          const subscription = subMap.get(ep.podcastId)!
          return { ...ep, subscription }
        })
        .filter((ep) => ep.subscription) // Safety check

      // Sort by publish date, newest first
      allEpisodes.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime()
        const dateB = new Date(b.publishedAt).getTime()
        return dateB - dateA
      })

      setEpisodes(allEpisodes)
    } catch {
      setError('Kunne ikke hente nye episoder')
    } finally {
      setIsLoading(false)
    }
  }, [subscriptions])

  useEffect(() => {
    fetchRecentEpisodes()
  }, [fetchRecentEpisodes])

  const handlePlayEpisode = (episode: EpisodeWithSubscription, e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onPlayEpisode({
      ...episode,
      podcastTitle: episode.subscription.title,
      podcastImage: episode.subscription.imageUrl,
    })
  }

  if (subscriptions.length === 0) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Velkommen til Lyttejeger</h2>
        <p className={styles.empty}>
          Bruk Søk for å finne podkaster, og abonner på dine favoritter for å se nye episoder her.
        </p>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Nye episoder</h2>
        <div className={styles.loading}>
          <span className={`material-symbols-outlined ${styles.spinner}`}>
            progress_activity
          </span>
          <span>Henter nye episoder...</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Nye episoder</h2>
        <p className={styles.error}>{error}</p>
      </section>
    )
  }

  if (episodes.length === 0) {
    return (
      <section className={styles.container}>
        <h2 className={styles.title}>Nye episoder</h2>
        <p className={styles.empty}>Ingen nye episoder siste 7 dager</p>
      </section>
    )
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>
        Nye episoder
        <span className={styles.badge}>{episodes.length}</span>
      </h2>
      <ul className={styles.list}>
        {episodes.map((episode) => {
          const isMenuOpen = menuOpenId === episode.id
          const isExpanded = expandedEpisodeId === episode.id
          return (
            <li
              key={episode.id}
              className={`${styles.item} ${isMenuOpen ? styles.menuOpen : ''}`}
            >
              <div className={styles.episodeHeader}>
                <button
                  className={styles.episodeToggle}
                  onClick={() => toggleEpisodeExpand(episode.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`episode-details-${episode.id}`}
                >
                  <img
                    src={episode.subscription.imageUrl}
                    alt=""
                    className={styles.image}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const placeholder = document.createElement('div')
                      placeholder.className = `${styles.image} image-placeholder`
                      placeholder.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">podcasts</span>'
                      target.parentNode?.insertBefore(placeholder, target)
                    }}
                  />
                  <div className={styles.info}>
                    <span className={styles.podcastName}>
                      {episode.subscription.title}
                    </span>
                    <span className={styles.episodeTitle}>{episode.title}</span>
                    <div className={styles.meta}>
                      <span>{formatDateLong(episode.publishedAt)}</span>
                      {formatDuration(episode.duration) && (
                        <span>{formatDuration(episode.duration)}</span>
                      )}
                    </div>
                  </div>
                </button>
                <div className={styles.actions}>
                  <div className={styles.menuContainer}>
                    <button
                      className={styles.menuButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setMenuOpenId(menuOpenId === episode.id ? null : episode.id)
                      }}
                      aria-label="Flere valg"
                      aria-expanded={isMenuOpen}
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {isMenuOpen && (
                      <div className={styles.menuDropdown}>
                        <button
                          className={styles.menuItem}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onPlayNext(
                              episode,
                              episode.subscription.title,
                              episode.subscription.imageUrl
                            )
                            setMenuOpenId(null)
                          }}
                        >
                          <span className="material-symbols-outlined">
                            playlist_play
                          </span>
                          Spill neste
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onAddToQueue(
                              episode,
                              episode.subscription.title,
                              episode.subscription.imageUrl
                            )
                            setMenuOpenId(null)
                          }}
                          disabled={isInQueue(episode.id)}
                        >
                          <span className="material-symbols-outlined">
                            queue_music
                          </span>
                          {isInQueue(episode.id) ? 'I køen' : 'Legg til i kø'}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.playButton}
                    onClick={(e) => handlePlayEpisode(episode, e)}
                    aria-label={`Spill ${episode.title}`}
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                  </button>
                </div>
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
    </section>
  )
}
