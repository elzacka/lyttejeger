import { AlertCircle as ErrorIcon } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { PodcastList } from './PodcastList';
import { EpisodeList } from './EpisodeList';
import { RandomDiscovery } from './RandomDiscovery';
import { useScrollDirection } from '../hooks/useScrollDirection';
import type {
  FilterOption,
  Podcast,
  SearchFilters,
  DateFilter,
  DiscoveryMode,
} from '../types/podcast';
import type { EpisodeWithPodcast } from '../utils/search';
import type { PlayingEpisode } from './AudioPlayer';
import type { TabType } from './TabBar';

interface SearchViewProps {
  filters: SearchFilters;
  results: {
    podcasts: Podcast[];
    episodes: EpisodeWithPodcast[];
  };
  isPending: boolean;
  error: string | null;
  activeTab: TabType;
  categories: FilterOption[];
  languages: string[];
  activeFilterCount: number;
  onSetQuery: (query: string) => void;
  onTabChange: (tab: TabType) => void;
  onToggleCategory: (category: string) => void;
  onToggleLanguage: (language: string) => void;
  onSetDateFrom: (date: DateFilter | null) => void;
  onSetDateTo: (date: DateFilter | null) => void;
  onSetSortBy: (sortBy: 'relevance' | 'newest' | 'oldest' | 'popular') => void;
  onSetDiscoveryMode: (mode: DiscoveryMode) => void;
  onClearFilters: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
  onSelectPodcastById: (podcastId: string) => void;
  onPlayEpisode: (episode: PlayingEpisode) => void;
  onAddToQueue: (episode: EpisodeWithPodcast) => void;
  onPlayNext: (episode: EpisodeWithPodcast) => void;
  isInQueue: (episodeId: string) => boolean;
}

export function SearchView({
  filters,
  results,
  isPending,
  error,
  activeTab,
  categories,
  languages,
  activeFilterCount,
  onSetQuery,
  onTabChange,
  onToggleCategory,
  onToggleLanguage,
  onSetDateFrom,
  onSetDateTo,
  onSetSortBy,
  onSetDiscoveryMode,
  onClearFilters,
  onSelectPodcast,
  onSelectPodcastById,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
}: SearchViewProps) {
  const scrollDirection = useScrollDirection();

  const showRandomDiscovery = !filters.query.trim() && activeFilterCount === 0 && !isPending;

  return (
    <>
      {/* Sticky search header - hides on scroll down, shows on scroll up */}
      <div className={`search-header ${scrollDirection === 'down' ? 'search-header--hidden' : ''}`}>
        <section className="search-section">
          <SearchBar value={filters.query} onChange={onSetQuery} isPending={isPending} />
        </section>

        <section className="filter-section">
          <FilterPanel
            filters={filters}
            categories={categories}
            languages={languages}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onToggleCategory={onToggleCategory}
            onToggleLanguage={onToggleLanguage}
            onSetDateFrom={onSetDateFrom}
            onSetDateTo={onSetDateTo}
            onSetDiscoveryMode={onSetDiscoveryMode}
            onClearFilters={onClearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <ErrorIcon size={20} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile-only reset button - positioned above results */}
      {activeFilterCount > 0 && (
        <div className="mobile-reset-row">
          <button className="mobile-reset-button" onClick={onClearFilters} type="button">
            Nullstill filtre
          </button>
        </div>
      )}

      <section className="results-section">
        {/* Show random discovery only when search is empty AND no filters are active */}
        {showRandomDiscovery ? (
          <RandomDiscovery
            onPlayEpisode={onPlayEpisode}
            onSelectPodcastById={onSelectPodcastById}
            onAddToQueue={onAddToQueue}
            onPlayNext={onPlayNext}
            isInQueue={isInQueue}
          />
        ) : activeTab === 'podcasts' ? (
          <PodcastList
            podcasts={results.podcasts}
            searchQuery={filters.query}
            isLoading={isPending}
            onSelectPodcast={onSelectPodcast}
            sortBy={filters.sortBy}
            onSetSortBy={onSetSortBy}
          />
        ) : (
          <EpisodeList
            episodes={results.episodes}
            searchQuery={filters.query}
            isLoading={isPending}
            onPlayEpisode={onPlayEpisode}
            onAddToQueue={onAddToQueue}
            onPlayNext={onPlayNext}
            isInQueue={isInQueue}
            onSelectPodcast={onSelectPodcastById}
            sortBy={filters.sortBy}
            onSetSortBy={onSetSortBy}
          />
        )}
      </section>
    </>
  );
}
