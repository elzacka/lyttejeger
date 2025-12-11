import { useState, useEffect, useCallback } from 'react'
import type { Subscription } from '../services/db'
import type { Episode } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { getEpisodesByFeedId } from '../services/podcastIndex'
import { transformEpisodes } from '../services/podcastTransform'
import { formatDuration, formatDateLong } from '../utils/search'
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

  const fetchRecentEpisodes = useCallback(async () => {
    if (subscriptions.length === 0) {
      setEpisodes([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const allEpisodes: EpisodeWithSubscription[] = []

      // Fetch episodes for each subscription
      for (const sub of subscriptions) {
        try {
          const feedId = parseInt(sub.podcastId)
          if (isNaN(feedId)) continue

          const res = await getEpisodesByFeedId(feedId, 10)
          const transformed = transformEpisodes(res.items || [])

          // Filter to last 7 days and add subscription info
          const recentEpisodes = transformed
            .filter((ep) => {
              const pubDate = new Date(ep.publishedAt).getTime()
              return pubDate >= sevenDaysAgo
            })
            .map((ep) => ({ ...ep, subscription: sub }))

          allEpisodes.push(...recentEpisodes)
        } catch {
          // Skip failed fetches for individual podcasts
        }
      }

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

  const handlePlayEpisode = (episode: EpisodeWithSubscription) => {
    onPlayEpisode({
      ...episode,
      podcastTitle: episode.subscription.title,
      podcastImage: episode.subscription.imageUrl,
    })
  }

  if (subscriptions.length === 0) {
    return null
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
          return (
            <li
              key={episode.id}
              className={`${styles.item} ${isMenuOpen ? styles.menuOpen : ''}`}
            >
              <img
                src={episode.subscription.imageUrl}
                alt=""
                className={styles.image}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.svg'
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
              <div className={styles.actions}>
                <div className={styles.menuContainer}>
                  <button
                    className={styles.menuButton}
                    onClick={() =>
                      setMenuOpenId(menuOpenId === episode.id ? null : episode.id)
                    }
                    aria-label="Flere valg"
                    aria-expanded={isMenuOpen}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                  {isMenuOpen && (
                    <div className={styles.menuDropdown}>
                      <button
                        className={styles.menuItem}
                        onClick={() => {
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
                        onClick={() => {
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
                  onClick={() => handlePlayEpisode(episode)}
                  aria-label={`Spill ${episode.title}`}
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
