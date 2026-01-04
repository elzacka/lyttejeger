import { useState, useCallback } from 'react';
import { OfflineBanner } from './components/OfflineBanner';
import { SearchView } from './components/SearchView';
import { PodcastDetailView } from './components/PodcastDetailView';
import { QueueView } from './components/QueueView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { HomeView } from './components/HomeView';
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopNav, type NavItem } from './components/TopNav';
import { SheetProvider } from './components/SheetProvider';
import { useSearch } from './hooks/useSearch';
import { useQueue } from './hooks/useQueue';
import { useSubscriptions } from './hooks/useSubscriptions';
import { allLanguages } from './data/languages';
import { allCategories } from './data/categories';
import { getPodcastByFeedId } from './services/podcastIndex';
import { transformFeed } from './services/podcastTransform';
import type { Podcast, Episode } from './types/podcast';
import type { EpisodeWithPodcast } from './utils/search';
import type { QueueItem } from './services/db';
import './App.css';

// Helper to map Episode/EpisodeWithPodcast to PlayingEpisode format for queue operations
function toPlayingEpisode(
  episode: Episode | EpisodeWithPodcast,
  podcastTitle?: string,
  podcastImage?: string
): PlayingEpisode {
  const podcast = 'podcast' in episode ? episode.podcast : undefined;
  return {
    id: episode.id,
    podcastId: episode.podcastId,
    title: episode.title,
    audioUrl: episode.audioUrl,
    imageUrl: episode.imageUrl,
    podcastTitle: podcastTitle ?? podcast?.title,
    podcastImage: podcastImage ?? podcast?.imageUrl,
    duration: episode.duration,
    description: episode.description,
    publishedAt: episode.publishedAt,
    transcriptUrl: episode.transcriptUrl,
    chaptersUrl: episode.chaptersUrl,
  };
}

function App() {
  const [playingEpisode, setPlayingEpisode] = useState<PlayingEpisode | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [previousActiveTab, setPreviousActiveTab] = useState<'home' | 'search' | 'subscriptions'>(
    'search'
  );
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'subscriptions' | 'queue'>(
    'search'
  );

  const {
    filters,
    results,
    isPending,
    error,
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    // toggleExcludeCategory available for future UI implementation
    toggleLanguage,
    setDateFrom,
    setDateTo,
    setSortBy,
    setDiscoveryMode,
    clearFilters,
    activeFilterCount,
  } = useSearch();

  const {
    queue,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    moveItem,
    isInQueue,
    queueLength,
  } = useQueue();
  const { subscriptions, subscribe, unsubscribe, isSubscribed, subscriptionCount } =
    useSubscriptions();

  const handlePlayEpisode = useCallback((episode: PlayingEpisode) => {
    setPlayingEpisode(episode);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null);
  }, []);

  const handleAddToQueue = useCallback(
    (episode: EpisodeWithPodcast) => {
      addToQueue(toPlayingEpisode(episode));
    },
    [addToQueue]
  );

  const handlePlayNext = useCallback(
    (episode: EpisodeWithPodcast) => {
      playNext(toPlayingEpisode(episode));
    },
    [playNext]
  );

  // Handlers for PodcastDetailView/HomeView episodes (simpler Episode type with explicit podcast info)
  const handleAddEpisodeToQueue = useCallback(
    (episode: Episode, podcastTitle: string, podcastImage: string) => {
      addToQueue(toPlayingEpisode(episode, podcastTitle, podcastImage));
    },
    [addToQueue]
  );

  const handlePlayEpisodeNext = useCallback(
    (episode: Episode, podcastTitle: string, podcastImage: string) => {
      playNext(toPlayingEpisode(episode, podcastTitle, podcastImage));
    },
    [playNext]
  );

  const handleSelectPodcast = useCallback(
    (podcast: Podcast) => {
      // Track which view user came from for back navigation
      setPreviousActiveTab(
        currentView === 'subscriptions'
          ? 'subscriptions'
          : currentView === 'search'
            ? 'search'
            : 'home'
      );
      setSelectedPodcast(podcast);
    },
    [currentView]
  );

  const handleBackFromPodcast = useCallback(() => {
    setSelectedPodcast(null);
  }, []);

  // Navigate to podcast by ID (from episode modal)
  const handleSelectPodcastById = useCallback(async (podcastId: string) => {
    try {
      const feedId = parseInt(podcastId);
      if (isNaN(feedId)) return;

      const res = await getPodcastByFeedId(feedId);
      const podcast = transformFeed(res.feed);
      setPreviousActiveTab('search');
      setSelectedPodcast(podcast);
    } catch {
      // Failed to fetch podcast - ignore
    }
  }, []);

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
    });
  }, []);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      moveItem(fromIndex, toIndex);
    },
    [moveItem]
  );

  // Subscription handlers
  const handleSubscribe = useCallback(() => {
    if (selectedPodcast) {
      subscribe(selectedPodcast);
    }
  }, [selectedPodcast, subscribe]);

  const handleUnsubscribe = useCallback(() => {
    if (selectedPodcast) {
      unsubscribe(selectedPodcast.id);
    }
  }, [selectedPodcast, unsubscribe]);

  // Handler to select podcast from subscriptions view
  const handleSelectSubscribedPodcast = useCallback(
    async (podcastId: string) => {
      try {
        const feedId = parseInt(podcastId);
        if (isNaN(feedId)) return;

        const res = await getPodcastByFeedId(feedId);
        const podcast = transformFeed(res.feed);
        setPreviousActiveTab('subscriptions');
        setSelectedPodcast(podcast);
      } catch {
        // Fallback to minimal data if API fails
        const sub = subscriptions.find((s) => s.podcastId === podcastId);
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
          };
          setPreviousActiveTab('subscriptions');
          setSelectedPodcast(podcast);
        }
      }
    },
    [subscriptions]
  );

  // Navigation handler for TopNav
  const handleNavigation = useCallback(
    (item: NavItem) => {
      // Clear selected podcast when navigating away
      setSelectedPodcast(null);

      if (item === 'home') {
        setCurrentView('home');
        setQuery('');
      } else if (item === 'search') {
        setCurrentView('search');
        setActiveTab('podcasts');
      } else if (item === 'subscriptions') {
        setCurrentView('subscriptions');
        setActiveTab('subscriptions');
      } else if (item === 'queue') {
        setCurrentView('queue');
        setActiveTab('queue');
      }
      // 'info' is handled internally by TopNav (opens InfoPopover)
    },
    [setActiveTab, setQuery]
  );

  // Determine active nav item
  const activeNavItem = selectedPodcast ? previousActiveTab : currentView;

  return (
    <SheetProvider>
      <div className="app">
        {/* Show PodcastDetailView when selected, otherwise show main content */}
        {selectedPodcast ? (
          <ErrorBoundary viewName="podcast-visningen">
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
          </ErrorBoundary>
        ) : (
          <>
            <a href="#main-content" className="skip-link">
              Hopp til hovedinnhold
            </a>
            <OfflineBanner />

            <main className="main" id="main-content">
              {/* Home view - shows recent episodes from subscriptions */}
              {currentView === 'home' && (
                <ErrorBoundary viewName="hjem-visningen">
                  <HomeView
                    subscriptions={subscriptions}
                    onPlayEpisode={handlePlayEpisode}
                    onAddToQueue={handleAddEpisodeToQueue}
                    onPlayNext={handlePlayEpisodeNext}
                    isInQueue={isInQueue}
                    onNavigateToSearch={() => handleNavigation('search')}
                  />
                </ErrorBoundary>
              )}

              {/* Search view - search bar, filters, and results */}
              {currentView === 'search' && (
                <ErrorBoundary viewName="søkevisningen">
                  <SearchView
                    filters={filters}
                    results={results}
                    isPending={isPending}
                    error={error}
                    activeTab={activeTab}
                    categories={allCategories}
                    languages={allLanguages}
                    activeFilterCount={activeFilterCount}
                    onSetQuery={setQuery}
                    onTabChange={setActiveTab}
                    onToggleCategory={toggleCategory}
                    onToggleLanguage={toggleLanguage}
                    onSetDateFrom={setDateFrom}
                    onSetDateTo={setDateTo}
                    onSetSortBy={setSortBy}
                    onSetDiscoveryMode={setDiscoveryMode}
                    onClearFilters={clearFilters}
                    onSelectPodcast={handleSelectPodcast}
                    onSelectPodcastById={handleSelectPodcastById}
                    onPlayEpisode={handlePlayEpisode}
                    onAddToQueue={handleAddToQueue}
                    onPlayNext={handlePlayNext}
                    isInQueue={isInQueue}
                  />
                </ErrorBoundary>
              )}

              {/* Subscriptions view */}
              {currentView === 'subscriptions' && (
                <ErrorBoundary viewName="abonnementene">
                  <SubscriptionsView
                    subscriptions={subscriptions}
                    onUnsubscribe={unsubscribe}
                    onSelectPodcast={handleSelectSubscribedPodcast}
                  />
                </ErrorBoundary>
              )}

              {/* Queue view */}
              {currentView === 'queue' && (
                <ErrorBoundary viewName="spillekøen">
                  <QueueView
                    queue={queue}
                    onPlay={handlePlayFromQueue}
                    onRemove={removeFromQueue}
                    onClear={clearQueue}
                    onReorder={handleReorder}
                  />
                </ErrorBoundary>
              )}
            </main>
          </>
        )}

        {/*
        CRITICAL: AudioPlayer and TopNav must remain at this root level.
        DO NOT move AudioPlayer inside conditional renders or view components.
        iOS Safari requires stable component mounting for audio playback.
        See CLAUDE.md "Audio Playback (iOS/Mobile)" and AudioPlayer.tsx header comments.
      */}
        <TopNav
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
  );
}

export default App;
