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
    activeTab,
    setActiveTab,
    setQuery,
    toggleCategory,
    toggleLanguage,
    setMinRating,
    setSortBy,
    setExplicit,
    clearFilters,
    activeFilterCount
  } = useSearch(mockPodcasts, mockEpisodes)

  return (
    <div className="app">
      <Header />

      <main className="main">
        <section className="search-section">
          <SearchBar
            value={filters.query}
            onChange={setQuery}
            isPending={isPending}
          />
          <p className="search-help">
            Tips: Bruk <code>"eksakt frase"</code>, <code>ord1 ord2</code> (AND),
            <code>ord1 OR ord2</code>, eller <code>-ekskluder</code>
          </p>
        </section>

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
        <p>Lyttejeger - Podcast Discovery App</p>
      </footer>
    </div>
  )
}

export default App
