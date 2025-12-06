import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { TabBar } from './components/TabBar'
import { PodcastList } from './components/PodcastList'
import { EpisodeList } from './components/EpisodeList'
import { useSearch } from './hooks/useSearch'
import { mockPodcasts, allCategories, allLanguages } from './data/mockPodcasts'
import { mockEpisodes } from './data/mockEpisodes'
import './App.css'

function App() {
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
    setMinRating,
    setSortBy,
    setExplicit,
    clearFilters,
    activeFilterCount,
    isApiConfigured
  } = useSearch(mockPodcasts, mockEpisodes, {
    useApi: true,
    fallbackPodcasts: mockPodcasts,
    fallbackEpisodes: mockEpisodes
  })

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
          <p className="search-help">
            {isApiConfigured ? (
              <>
                <span className="api-status api-status--connected" title="Podcast Index API tilkoblet">
                  ● Live
                </span>
                {' '}
              </>
            ) : (
              <>
                <span className="api-status api-status--offline" title="Bruker demo-data">
                  ○ Demo
                </span>
                {' '}
              </>
            )}
            Tips: Bruk <code>"eksakt frase"</code>, <code>ord1 ord2</code> (AND),
            <code>ord1 OR ord2</code>, eller <code>-ekskluder</code>
          </p>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <section className="filter-section">
          <FilterPanel
            filters={filters}
            categories={allCategories}
            languages={allLanguages}
            onToggleCategory={toggleCategory}
            onToggleLanguage={toggleLanguage}
            onSetMinRating={setMinRating}
            onSetSortBy={setSortBy}
            onSetExplicit={setExplicit}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>

        <section className="results-section">
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            podcastCount={results.podcasts.length}
            episodeCount={results.episodes.length}
          />

          {activeTab === 'podcasts' ? (
            <PodcastList
              podcasts={results.podcasts}
              searchQuery={filters.query}
              isLoading={isPending}
            />
          ) : (
            <EpisodeList
              episodes={results.episodes}
              isLoading={isPending}
            />
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          Lyttejeger - Podcast Discovery App
          {isApiConfigured && (
            <span className="footer-api"> • Powered by Podcast Index</span>
          )}
        </p>
      </footer>
    </div>
  )
}

export default App
