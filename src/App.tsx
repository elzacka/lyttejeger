import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { PodcastList } from './components/PodcastList'
import { useSearch } from './hooks/useSearch'
import { mockPodcasts, allCategories, allLanguages } from './data/mockPodcasts'
import './App.css'

function App() {
  const {
    filters,
    results,
    isPending,
    setQuery,
    toggleCategory,
    toggleLanguage,
    setMinRating,
    setSortBy,
    setExplicit,
    clearFilters,
    activeFilterCount
  } = useSearch(mockPodcasts)

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
          <PodcastList
            podcasts={results}
            searchQuery={filters.query}
            isLoading={isPending}
          />
        </section>
      </main>

      <footer className="footer">
        <p>Lyttejeger - Podcast Discovery App</p>
      </footer>
    </div>
  )
}

export default App
