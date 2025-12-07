import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { PodcastList } from './components/PodcastList'
import { EpisodeList } from './components/EpisodeList'
import { HelpModal } from './components/HelpModal'
import { AudioPlayer, type PlayingEpisode } from './components/AudioPlayer'
import { useSearch } from './hooks/useSearch'
import { allLanguages } from './data/languages'
import { getCategories, isConfigured } from './services/podcastIndex'
import { translateCategory } from './utils/categoryTranslations'
import type { FilterOption } from './types/podcast'
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
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [playingEpisode, setPlayingEpisode] = useState<PlayingEpisode | null>(null)

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
    setMinRating,
    setSortBy,
    clearFilters,
    activeFilterCount
  } = useSearch()

  const handlePlayEpisode = useCallback((episode: PlayingEpisode) => {
    setPlayingEpisode(episode)
  }, [])

  const handleClosePlayer = useCallback(() => {
    setPlayingEpisode(null)
  }, [])

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
            onSetMinRating={setMinRating}
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
              onPlayEpisode={handlePlayEpisode}
            />
          ) : (
            <EpisodeList
              episodes={results.episodes}
              isLoading={isPending}
              onPlayEpisode={handlePlayEpisode}
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
        <button
          className="help-button"
          onClick={() => setIsHelpOpen(true)}
          aria-label="Søketips"
          title="Søketips"
        >
          <span className="material-symbols-outlined help-icon" aria-hidden="true">text_ad</span>
        </button>
      </footer>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <AudioPlayer episode={playingEpisode} onClose={handleClosePlayer} />
    </div>
  )
}

export default App
