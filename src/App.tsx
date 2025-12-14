import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SearchView } from './components/SearchView'
import { PodcastDetailView } from './components/PodcastDetailView'
import { QueueView } from './components/QueueView'
import { SubscriptionsView } from './components/SubscriptionsView'
import { HomeView } from './components/HomeView'
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BottomNav, type NavItem } from './components/BottomNav'
import { SheetProvider } from './components/SheetProvider'
import { useSearch } from './hooks/useSearch'
import { useQueue } from './hooks/useQueue'
import { useSubscriptions } from './hooks/useSubscriptions'
import { allLanguages } from './data/languages'
import { getCategories, isConfigured, getPodcastByFeedId } from './services/podcastIndex'
import { transformFeed } from './services/podcastTransform'
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
  const [previousActiveTab, setPreviousActiveTab] = useState<'home' | 'search' | 'subscriptions'>('search')
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'subscriptions' | 'queue'>('search')

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

  // Handlers for PodcastDetailView episodes (simpler Episode type)
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
    // Track which view user came from for back navigation
    setPreviousActiveTab(currentView === 'subscriptions' ? 'subscriptions' : currentView === 'search' ? 'search' : 'home')
    setSelectedPodcast(podcast)
  }, [currentView])

  const handleBackFromPodcast = useCallback(() => {
    setSelectedPodcast(null)
  }, [])

  // Navigate to podcast by ID (from episode modal)
  const handleSelectPodcastById = useCallback(async (podcastId: string) => {
    try {
      const feedId = parseInt(podcastId)
      if (isNaN(feedId)) return

      const res = await getPodcastByFeedId(feedId)
      const podcast = transformFeed(res.feed)
      setPreviousActiveTab('search')
      setSelectedPodcast(podcast)
    } catch {
      // Failed to fetch podcast - ignore
    }
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

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    moveItem(fromIndex, toIndex)
  }, [moveItem])

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
    try {
      const feedId = parseInt(podcastId)
      if (isNaN(feedId)) return

      const res = await getPodcastByFeedId(feedId)
      const podcast = transformFeed(res.feed)
      setPreviousActiveTab('subscriptions')
      setSelectedPodcast(podcast)
    } catch {
      // Fallback to minimal data if API fails
      const sub = subscriptions.find(s => s.podcastId === podcastId)
      if (sub) {
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
        setPreviousActiveTab('subscriptions')
        setSelectedPodcast(podcast)
      }
    }
  }, [subscriptions])

  // Navigation handler for BottomNav
  const handleNavigation = useCallback((item: NavItem) => {
    // Clear selected podcast when navigating away
    setSelectedPodcast(null)

    if (item === 'home') {
      setCurrentView('home')
      setQuery('')
    } else if (item === 'search') {
      setCurrentView('search')
      setActiveTab('podcasts')
    } else if (item === 'subscriptions') {
      setCurrentView('subscriptions')
      setActiveTab('subscriptions')
    } else if (item === 'queue') {
      setCurrentView('queue')
      setActiveTab('queue')
    }
    // 'info' is handled internally by BottomNav (opens InfoSheet)
  }, [setActiveTab, setQuery])

  // Determine active nav item
  const activeNavItem = selectedPodcast
    ? previousActiveTab
    : currentView

  return (
    <SheetProvider>
    <div className="app">
      {/* Show PodcastDetailView when selected, otherwise show main content */}
      {selectedPodcast ? (
        <PodcastDetailView
          podcast={selectedPodcast}
          onPlayEpisode={handlePlayEpisode}
          onAddToQueue={handleAddEpisodeToQueue}
          onPlayNext={handlePlayEpisodeNext}
          isInQueue={isInQueue}
          isSubscribed={isSubscribed(selectedPodcast.id)}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
          onBack={handleBackFromPodcast}
        />
      ) : (
        <>
          <a href="#main-content" className="skip-link">
            Hopp til hovedinnhold
          </a>
          <Header />

          <main className="main" id="main-content">
            {/* Home view - shows recent episodes from subscriptions */}
            {currentView === 'home' && (
              <HomeView
                subscriptions={subscriptions}
                onPlayEpisode={handlePlayEpisode}
                onAddToQueue={handleAddEpisodeToQueue}
                onPlayNext={handlePlayEpisodeNext}
                isInQueue={isInQueue}
                onNavigateToSearch={() => handleNavigation('search')}
              />
            )}

            {/* Search view - search bar, filters, and results */}
            {currentView === 'search' && (
              <SearchView
                filters={filters}
                results={results}
                isPending={isPending}
                error={error}
                activeTab={activeTab}
                categories={categories}
                languages={allLanguages}
                activeFilterCount={activeFilterCount}
                onSetQuery={setQuery}
                onTabChange={setActiveTab}
                onToggleCategory={toggleCategory}
                onToggleLanguage={toggleLanguage}
                onSetDateFrom={setDateFrom}
                onSetDateTo={setDateTo}
                onSetSortBy={setSortBy}
                onClearFilters={clearFilters}
                onSelectPodcast={handleSelectPodcast}
                onSelectPodcastById={handleSelectPodcastById}
                onPlayEpisode={handlePlayEpisode}
                onAddToQueue={handleAddToQueue}
                onPlayNext={handlePlayNext}
                isInQueue={isInQueue}
              />
            )}

            {/* Subscriptions view */}
            {currentView === 'subscriptions' && (
              <SubscriptionsView
                subscriptions={subscriptions}
                onUnsubscribe={unsubscribe}
                onSelectPodcast={handleSelectSubscribedPodcast}
              />
            )}

            {/* Queue view */}
            {currentView === 'queue' && (
              <QueueView
                queue={queue}
                onPlay={handlePlayFromQueue}
                onRemove={removeFromQueue}
                onClear={clearQueue}
                onReorder={handleReorder}
              />
            )}
          </main>
        </>
      )}

      {/* Always render BottomNav and AudioPlayer at the same level to prevent remounting */}
      <BottomNav
        activeItem={activeNavItem}
        onNavigate={handleNavigation}
        queueCount={queueLength}
        subscriptionCount={subscriptionCount}
      />
      <ErrorBoundary>
        <AudioPlayer episode={playingEpisode} onClose={handleClosePlayer} />
      </ErrorBoundary>
    </div>
    </SheetProvider>
  )
}

export default App
