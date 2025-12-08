import { useEffect, useState } from 'react'
import type { Podcast, Episode } from '../types/podcast'
import type { PlayingEpisode } from './AudioPlayer'
import { getEpisodesByFeedId } from '../services/podcastIndex'
import { transformEpisodes } from '../services/podcastTransform'
import { formatDuration, formatDateShort, formatDateLong } from '../utils/search'
import { translateCategory } from '../utils/categoryTranslations'
import styles from './PodcastPage.module.css'

interface PodcastPageProps {
  podcast: Podcast
  onBack: () => void
  onPlayEpisode: (episode: PlayingEpisode) => void
}

export function PodcastPage({ podcast, onBack, onPlayEpisode }: PodcastPageProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [episodesError, setEpisodesError] = useState<string | null>(null)
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null)

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

  const handleSubscribe = () => {
    window.open(podcast.feedUrl, '_blank', 'noopener,noreferrer')
  }

  const toggleEpisodeExpand = (episodeId: string) => {
    setExpandedEpisodeId(prev => prev === episodeId ? null : episodeId)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={onBack}
          aria-label="Tilbake til søkeresultater"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className={styles.headerTitle}>Podcast</h1>
      </header>

      <div className={styles.content}>
        <section className={styles.podcastInfo}>
          <img
            src={podcast.imageUrl}
            alt={`Omslagsbilde for ${podcast.title}`}
            className={styles.image}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.svg'
            }}
          />
          <div className={styles.infoContent}>
            <h2 className={styles.title}>{podcast.title}</h2>
            <p className={styles.author}>{podcast.author}</p>
            <div className={styles.rating}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--warning-color)' }}>star</span>
              <span>{podcast.rating.toFixed(1)}</span>
            </div>
            {podcast.explicit && <span className={styles.explicitBadge}>Eksplisitt</span>}
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

        <div className={styles.actions}>
          <button className={styles.subscribeButton} onClick={handleSubscribe}>
            <span className="material-symbols-outlined">rss_feed</span>
            Abonner
          </button>
        </div>

        <section className={styles.episodesSection}>
          <h3 className={styles.episodesTitle}>Episoder</h3>

          {isLoadingEpisodes && (
            <div className={styles.loading}>
              <span className={`material-symbols-outlined ${styles.spinner}`}>progress_activity</span>
              <span>Henter episoder ...</span>
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
                return (
                  <li key={episode.id} className={styles.episodeItem}>
                    <div className={styles.episodeHeader}>
                      <button
                        className={styles.playButton}
                        onClick={() => handlePlayEpisode(episode)}
                        aria-label={`Spill ${episode.title}`}
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                      </button>
                      <button
                        className={styles.episodeToggle}
                        onClick={() => toggleEpisodeExpand(episode.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`episode-details-${episode.id}`}
                      >
                        <div className={styles.episodeInfo}>
                          <p className={styles.episodeTitle}>{episode.title}</p>
                          <div className={styles.episodeMeta}>
                            <span>{formatDateLong(episode.publishedAt)}</span>
                            {formatDuration(episode.duration) && <span>{formatDuration(episode.duration)}</span>}
                          </div>
                        </div>
                        <span className={`material-symbols-outlined ${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                          expand_more
                        </span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div
                        id={`episode-details-${episode.id}`}
                        className={styles.episodeDetails}
                      >
                        {episode.description ? (
                          <p className={styles.episodeDescription}>{episode.description}</p>
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
