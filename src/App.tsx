import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { PodcastList } from './components/PodcastList'
import { EpisodeList } from './components/EpisodeList'
import { PodcastPage } from './components/PodcastPage'
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer'
import { useSearch } from './hooks/useSearch'
import { useQueue } from './hooks/useQueue'
import { allLanguages } from './data/languages'
import { getCategories, isConfigured } from './services/podcastIndex'
import { translateCategory } from './utils/categoryTranslations'
import type { FilterOption, Podcast, Episode } from './types/podcast'
import type { EpisodeWithPodcast } from './utils/search'
import './App.css'

// Fallback categories if API fails
const fallbackCategories: FilterOption[] = [
  { value: 'Society & Culture', label: 'Samfunn og kultur' },
  { value: 'News', label: 'Nyheter' },
  { value: 'Comedy', label: 'Humor' },
  { value: 'True Crime', label: 'Krim' },
  { value: 'Sports', label: 'Sport' },
  { value: 'Technology', label: 'Teknologi' },
  { value: 'Business', label: 'Næringsliv' },
  { value: 'Health & Fitness', label: 'Helse og trening' },
  { value: 'Education', label: 'Utdanning' },
  { value: 'Arts', label: 'Kunst' }
]

function App() {
  const [categories, setCategories] = useState<FilterOption[]>(fallbackCategories)
  const [playingEpisode, setPlayingEpisode] = useState<PlayingEpisode | null>(null)
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null)

  // Fetch categories from API on mount
  useEffect(() => {
    if (isConfigured()) {
      getCategories()
        .then(res => {
          const apiCategories = res.feeds.map(cat => ({
            value: cat.name,
            label: translateCategory(cat.name)
          }))
          // Sort alphabetically by Norwegian label
          apiCategories.sort((a, b) => a.label.localeCompare(b.label, 'nb'))
          setCategories(apiCategories)
        })
        .catch(() => {
          // Keep fallback categories on error
        })
    }
  }, [])

  const {
    filters,
    results,
    isPending,
    error,
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    toggleLanguage,
    setDateFrom,
    setDateTo,
    setSortBy,
    clearFilters,
    activeFilterCount
  } = useSearch()

  const { addToQueue, playNext, isInQueue } = useQueue()

  const handlePlayEpisode = useCallback((episode: PlayingEpisode) => {
    setPlayingEpisode(episode)
  }, [])

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null)
  }, [])

  const handleAddToQueue = useCallback((episode: EpisodeWithPodcast) => {
    addToQueue({
      id: episode.id,
      podcastId: episode.podcastId,
      title: episode.title,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      podcastTitle: episode.podcast?.title,
      podcastImage: episode.podcast?.imageUrl,
      duration: episode.duration,
      description: episode.description,
      publishedAt: episode.publishedAt,
    })
  }, [addToQueue])

  const handlePlayNext = useCallback((episode: EpisodeWithPodcast) => {
    playNext({
      id: episode.id,
      podcastId: episode.podcastId,
      title: episode.title,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      podcastTitle: episode.podcast?.title,
      podcastImage: episode.podcast?.imageUrl,
      duration: episode.duration,
      description: episode.description,
      publishedAt: episode.publishedAt,
    })
  }, [playNext])

  // Handlers for PodcastPage episodes (simpler Episode type)
  const handleAddEpisodeToQueue = useCallback((episode: Episode, podcastTitle: string, podcastImage: string) => {
    addToQueue({
      id: episode.id,
      podcastId: episode.podcastId,
      title: episode.title,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      podcastTitle,
      podcastImage,
      duration: episode.duration,
      description: episode.description,
      publishedAt: episode.publishedAt,
    })
  }, [addToQueue])

  const handlePlayEpisodeNext = useCallback((episode: Episode, podcastTitle: string, podcastImage: string) => {
    playNext({
      id: episode.id,
      podcastId: episode.podcastId,
      title: episode.title,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      podcastTitle,
      podcastImage,
      duration: episode.duration,
      description: episode.description,
      publishedAt: episode.publishedAt,
    })
  }, [playNext])

  const handleSelectPodcast = useCallback((podcast: Podcast) => {
    setSelectedPodcast(podcast)
  }, [])

  const handleBackToSearch = useCallback(() => {
    setSelectedPodcast(null)
  }, [])

  // If a podcast is selected, show the podcast page
  if (selectedPodcast) {
    return (
      <div className="app">
        <PodcastPage
          podcast={selectedPodcast}
          onBack={handleBackToSearch}
          onPlayEpisode={handlePlayEpisode}
          onAddToQueue={handleAddEpisodeToQueue}
          onPlayNext={handlePlayEpisodeNext}
          isInQueue={isInQueue}
        />
        <AudioPlayer episode={playingEpisode} onClose={handleClosePlayer} />
      </div>
    )
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Hopp til hovedinnhold
      </a>
      <Header />

      <main className="main" id="main-content">
        <section className="search-section">
          <SearchBar
            value={filters.query}
            onChange={setQuery}
            isPending={isPending}
          />
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{error}</span>
          </div>
        )}

        <section className="filter-section">
          <FilterPanel
            filters={filters}
            categories={categories}
            languages={allLanguages}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onToggleCategory={toggleCategory}
            onToggleLanguage={toggleLanguage}
            onSetDateFrom={setDateFrom}
            onSetDateTo={setDateTo}
            onSetSortBy={setSortBy}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>

        <section className="results-section">
          {activeTab === 'podcasts' ? (
            <PodcastList
              podcasts={results.podcasts}
              searchQuery={filters.query}
              isLoading={isPending}
              onSelectPodcast={handleSelectPodcast}
            />
          ) : (
            <EpisodeList
              episodes={results.episodes}
              searchQuery={filters.query}
              isLoading={isPending}
              onPlayEpisode={handlePlayEpisode}
              onAddToQueue={handleAddToQueue}
              onPlayNext={handlePlayNext}
              isInQueue={isInQueue}
            />
          )}
        </section>
      </main>

      <footer className="footer">
        <p className="footer-attribution">
          Data fra{' '}
          <a
            href="https://podcastindex.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Podcast Index
          </a>
          {' | '}
          <a
            href="https://github.com/elzacka/lyttejeger/blob/main/PRIVACY.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            Personvern
          </a>
        </p>
      </footer>
      <AudioPlayer episode={playingEpisode} onClose={handleClosePlayer} />
    </div>
  )
}

export default App
