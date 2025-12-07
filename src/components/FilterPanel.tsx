import { useState } from 'react'
import type { SearchFilters, FilterOption } from '../types/podcast'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  filters: SearchFilters
  categories: FilterOption[]
  languages: string[]
  activeTab: 'podcasts' | 'episodes'
  onTabChange: (tab: 'podcasts' | 'episodes') => void
  onToggleCategory: (category: string) => void
  onToggleLanguage: (language: string) => void
  onSetMinRating: (rating: number) => void
  onSetSortBy: (sortBy: SearchFilters['sortBy']) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export function FilterPanel({
  filters,
  categories,
  languages,
  activeTab,
  onTabChange,
  onToggleCategory,
  onToggleLanguage,
  onSetMinRating,
  onSetSortBy,
  onClearFilters,
  activeFilterCount
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.typeSelector} role="radiogroup" aria-label="Velg hva du vil søke etter">
          <button
            className={`${styles.typeButton} ${activeTab === 'podcasts' ? styles.typeButtonActive : ''}`}
            onClick={() => onTabChange('podcasts')}
            role="radio"
            aria-checked={activeTab === 'podcasts'}
          >
            Podcaster
          </button>
          <button
            className={`${styles.typeButton} ${activeTab === 'episodes' ? styles.typeButtonActive : ''}`}
            onClick={() => onTabChange('episodes')}
            role="radio"
            aria-checked={activeTab === 'episodes'}
          >
            Episoder
          </button>
        </div>

        <button
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          Filtre
          {activeFilterCount > 0 && (
            <span className={styles.badge}>{activeFilterCount}</span>
          )}
        </button>

        <div className={styles.sortContainer}>
          <select
            id="sort-select"
            className={styles.sortSelect}
            value={filters.sortBy}
            onChange={(e) => onSetSortBy(e.target.value as SearchFilters['sortBy'])}
            aria-label="Velg sorteringsrekkefølge"
          >
            <option value="relevance">Relevans</option>
            <option value="rating">Vurdering</option>
            <option value="newest">Nyeste</option>
            <option value="popular">Populære</option>
          </select>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Kategori</h3>
            <div className={styles.chipGrid}>
              {categories.map((category) => (
                <button
                  key={category.value}
                  className={`${styles.chip} ${
                    filters.categories.includes(category.value) ? styles.chipActive : ''
                  }`}
                  onClick={() => onToggleCategory(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Språk</h3>
            <div className={styles.chipGrid}>
              {languages.map((language) => (
                <button
                  key={language}
                  className={`${styles.chip} ${
                    filters.languages.includes(language) ? styles.chipActive : ''
                  }`}
                  onClick={() => onToggleLanguage(language)}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Minste vurdering</h3>
            <div className={styles.ratingContainer}>
              {[0, 3, 3.5, 4, 4.5].map((rating) => (
                <button
                  key={rating}
                  className={`${styles.ratingButton} ${
                    filters.minRating === rating ? styles.ratingActive : ''
                  }`}
                  onClick={() => onSetMinRating(rating)}
                >
                  {rating === 0 ? 'Alle' : `${rating}+`}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className={styles.clearButton} onClick={onClearFilters}>
              Fjern alle filtre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
