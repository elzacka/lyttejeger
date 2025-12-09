import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { PodcastList } from './components/PodcastList'
import { EpisodeList } from './components/EpisodeList'
import { PodcastPage } from './components/PodcastPage'
import { QueueView } from './components/QueueView'
import { SubscriptionsView } from './components/SubscriptionsView'
import { RecentEpisodes } from './components/RecentEpisodes'
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer'
import { BottomNav, type NavItem } from './components/BottomNav'
import { useSearch } from './hooks/useSearch'
import { useQueue } from './hooks/useQueue'
import { useSubscriptions } from './hooks/useSubscriptions'
import { allLanguages } from './data/languages'
import { getCategories, isConfigured } from './services/podcastIndex'
import { translateCategory } from './utils/categoryTranslations'
import type { FilterOption, Podcast, Episode } from './types/podcast'
import type { EpisodeWithPodcast } from './utils/search'
import type { QueueItem } from './services/db'
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

  const { queue, addToQueue, playNext, removeFromQueue, clearQueue, moveItem, isInQueue, queueLength } = useQueue()
  const { subscriptions, subscribe, unsubscribe, isSubscribed, subscriptionCount } = useSubscriptions()

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

  // Queue handlers
  const handlePlayFromQueue = useCallback((item: QueueItem) => {
    setPlayingEpisode({
      id: item.episodeId,
      podcastId: item.podcastId,
      title: item.title,
      audioUrl: item.audioUrl,
      imageUrl: item.imageUrl,
      podcastTitle: item.podcastTitle,
      podcastImage: item.podcastImage,
      duration: item.duration ?? 0,
      description: '',
      publishedAt: '',
    })
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      moveItem(index, index - 1)
    }
  }, [moveItem])

  const handleMoveDown = useCallback((index: number) => {
    if (index < queue.length - 1) {
      moveItem(index, index + 1)
    }
  }, [moveItem, queue.length])

  // Subscription handlers
  const handleSubscribe = useCallback(() => {
    if (selectedPodcast) {
      subscribe(selectedPodcast)
    }
  }, [selectedPodcast, subscribe])

  const handleUnsubscribe = useCallback(() => {
    if (selectedPodcast) {
      unsubscribe(selectedPodcast.id)
    }
  }, [selectedPodcast, unsubscribe])

  // Handler to select podcast from subscriptions view
  const handleSelectSubscribedPodcast = useCallback(async (podcastId: string) => {
    // We need to fetch the podcast data from the API
    const sub = subscriptions.find(s => s.podcastId === podcastId)
    if (sub) {
      // Create a minimal podcast object from subscription data
      // The PodcastPage will fetch episodes anyway
      const podcast: Podcast = {
        id: sub.podcastId,
        title: sub.title,
        author: sub.author,
        description: '',
        imageUrl: sub.imageUrl,
        feedUrl: sub.feedUrl,
        categories: [],
        language: '',
        episodeCount: 0,
        lastUpdated: '',
        rating: 0,
        explicit: false,
      }
      setSelectedPodcast(podcast)
    }
  }, [subscriptions])

  // Navigation handler for BottomNav
  const handleNavigation = useCallback((item: NavItem) => {
    if (item === 'subscriptions' || item === 'queue') {
      setActiveTab(item)
    }
    // 'info' is handled internally by BottomNav (opens InfoSheet)
  }, [setActiveTab])

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
          isSubscribed={isSubscribed(selectedPodcast.id)}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
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
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>

        {/* Show recent episodes from subscriptions when not searching */}
        {subscriptionCount > 0 && !filters.query && activeTab !== 'queue' && activeTab !== 'subscriptions' && (
          <RecentEpisodes
            subscriptions={subscriptions}
            onPlayEpisode={handlePlayEpisode}
            onAddToQueue={handleAddEpisodeToQueue}
            onPlayNext={handlePlayEpisodeNext}
            isInQueue={isInQueue}
          />
        )}

        <section className="results-section">
          {(activeTab === 'podcasts' || activeTab === 'episodes') && filters.query && (
            <div className="sort-bar">
              <select
                className="sort-select"
                value={filters.sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof filters.sortBy)}
                aria-label="Sorter resultater"
              >
                <option value="relevance">Relevans</option>
                <option value="newest">Nyeste</option>
                <option value="oldest">Eldste</option>
                <option value="popular">Populære</option>
              </select>
            </div>
          )}
          {activeTab === 'queue' ? (
            <QueueView
              queue={queue}
              onPlay={handlePlayFromQueue}
              onRemove={removeFromQueue}
              onClear={clearQueue}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ) : activeTab === 'subscriptions' ? (
            <SubscriptionsView
              subscriptions={subscriptions}
              onUnsubscribe={unsubscribe}
              onSelectPodcast={handleSelectSubscribedPodcast}
            />
          ) : activeTab === 'podcasts' ? (
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

      <BottomNav
        activeItem={activeTab === 'subscriptions' || activeTab === 'queue' ? activeTab : null}
        onNavigate={handleNavigation}
        queueCount={queueLength}
        subscriptionCount={subscriptionCount}
      />
      <AudioPlayer episode={playingEpisode} onClose={handleClosePlayer} />
    </div>
  )
}

export default App
