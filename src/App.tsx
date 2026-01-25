import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { OfflineBanner } from './components/OfflineBanner';
import { HomeView } from './components/HomeView';
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopNav, type NavItem } from './components/TopNav';
import { SheetProvider } from './components/SheetProvider';
import { SkipLink } from './components/SkipLink';

// Lazy load non-critical views for better performance
const PodcastDetailView = lazy(() => import('./components/PodcastDetailView'));
const QueueView = lazy(() => import('./components/QueueView'));
const MyPodsView = lazy(() => import('./components/MyPodsView'));
import { useSearch } from './hooks/useSearch';
import { useQueue } from './hooks/useQueue';
import { useSubscriptions } from './hooks/useSubscriptions';
import { usePlaybackProgress } from './hooks/usePlaybackProgress';
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
    season: episode.season,
    episode: episode.episode,
  };
}

function App() {
  const [playingEpisode, setPlayingEpisode] = useState<PlayingEpisode | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [previousActiveTab, setPreviousActiveTab] = useState<'search' | 'subscriptions'>(
    'search'
  );
  const [currentView, setCurrentView] = useState<'search' | 'subscriptions' | 'queue'>(
    'search'
  );

  // Scroll-lock failsafe: ensure body scroll is always restored
  useEffect(() => {
    const restoreScroll = () => {
      document.body.classList.remove('scroll-lock');
    };

    // Restore on mount
    restoreScroll();

    // Restore when page becomes visible (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        restoreScroll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
  const { getProgress } = usePlaybackProgress();

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
          : 'search'
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
      description: item.description || '',
      publishedAt: item.publishedAt || '',
      transcriptUrl: item.transcriptUrl,
      chaptersUrl: item.chaptersUrl,
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
      // Use View Transitions API for smooth navigation if available
      const transition = () => {
        // Clear selected podcast when navigating away
        setSelectedPodcast(null);

        if (item === 'search') {
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
      };

      // Check if View Transitions API is supported
      if ('startViewTransition' in document) {
        (document as any).startViewTransition(transition);
      } else {
        transition();
      }
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
            <Suspense fallback={<div className="loading-view">Laster podcast...</div>}>
              <PodcastDetailView
                podcast={selectedPodcast}
                onPlayEpisode={handlePlayEpisode}
                onAddToQueue={handleAddEpisodeToQueue}
                onPlayNext={handlePlayEpisodeNext}
                isInQueue={isInQueue}
                getProgress={getProgress}
                isSubscribed={isSubscribed(selectedPodcast.id)}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
                onBack={handleBackFromPodcast}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            <SkipLink />
            <OfflineBanner />

            <main className="main" id="main-content" role="main" aria-label="Hovedinnhold">
              {/* Home view - search bar, filters, and results (or recent episodes when empty) */}
              {currentView === 'search' && (
                <ErrorBoundary viewName="søkevisningen">
                  <HomeView
                    filters={filters}
                    results={results}
                    isPending={isPending}
                    error={error}
                    activeTab={activeTab}
                    categories={allCategories}
                    languages={allLanguages}
                    activeFilterCount={activeFilterCount}
                    subscriptions={subscriptions}
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

              {/* My Pods view */}
              {currentView === 'subscriptions' && (
                <ErrorBoundary viewName="podcaster du følger">
                  <Suspense fallback={<div className="loading-view">Laster...</div>}>
                    <MyPodsView
                      subscriptions={subscriptions}
                      onUnsubscribe={unsubscribe}
                      onSelectPodcast={handleSelectSubscribedPodcast}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}

              {/* Queue view */}
              {currentView === 'queue' && (
                <ErrorBoundary viewName="spillekøen">
                  <Suspense fallback={<div className="loading-view">Laster...</div>}>
                    <QueueView
                      queue={queue}
                      onPlay={handlePlayFromQueue}
                      onRemove={removeFromQueue}
                      onClear={clearQueue}
                      onReorder={handleReorder}
                      getProgress={getProgress}
                    />
                  </Suspense>
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
