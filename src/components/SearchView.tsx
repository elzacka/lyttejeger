import { ErrorIcon } from './icons';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { PodcastList } from './PodcastList';
import { EpisodeList } from './EpisodeList';
import { useScrollDirection } from '../hooks/useScrollDirection';
import type { FilterOption, Podcast, SearchFilters, DateFilter } from '../types/podcast';
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
  onClearFilters,
  onSelectPodcast,
  onSelectPodcastById,
  onPlayEpisode,
  onAddToQueue,
  onPlayNext,
  isInQueue,
}: SearchViewProps) {
  const scrollDirection = useScrollDirection();

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

      <section className="results-section">
        {(activeTab === 'podcasts' || activeTab === 'episodes') && filters.query && (
          <div className="sort-bar">
            <select
              className="sort-select"
              value={filters.sortBy}
              onChange={(e) => onSetSortBy(e.target.value as typeof filters.sortBy)}
              aria-label="Sorter resultater"
            >
              <option value="relevance">Relevans</option>
              <option value="newest">Nyeste</option>
              <option value="oldest">Eldste</option>
              <option value="popular">Populære</option>
            </select>
          </div>
        )}
        {activeTab === 'podcasts' ? (
          <PodcastList
            podcasts={results.podcasts}
            searchQuery={filters.query}
            isLoading={isPending}
            onSelectPodcast={onSelectPodcast}
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
          />
        )}
      </section>
    </>
  );
}
