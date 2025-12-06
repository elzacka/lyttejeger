import { useState } from 'react'
import type { SearchFilters } from '../types/podcast'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  filters: SearchFilters
  categories: string[]
  languages: string[]
  onToggleCategory: (category: string) => void
  onToggleLanguage: (language: string) => void
  onSetMinRating: (rating: number) => void
  onSetSortBy: (sortBy: SearchFilters['sortBy']) => void
  onSetExplicit: (explicit: boolean | null) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export function FilterPanel({
  filters,
  categories,
  languages,
  onToggleCategory,
  onToggleLanguage,
  onSetMinRating,
  onSetSortBy,
  onSetExplicit,
  onClearFilters,
  activeFilterCount
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
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
            <line x1="4" x2="4" y1="21" y2="14" />
            <line x1="4" x2="4" y1="10" y2="3" />
            <line x1="12" x2="12" y1="21" y2="12" />
            <line x1="12" x2="12" y1="8" y2="3" />
            <line x1="20" x2="20" y1="21" y2="16" />
            <line x1="20" x2="20" y1="12" y2="3" />
            <line x1="2" x2="6" y1="14" y2="14" />
            <line x1="10" x2="14" y1="8" y2="8" />
            <line x1="18" x2="22" y1="16" y2="16" />
          </svg>
          <span>Filtre</span>
          {activeFilterCount > 0 && (
            <span className={styles.badge}>{activeFilterCount}</span>
          )}
        </button>

        <div className={styles.sortContainer}>
          <label htmlFor="sort-select" className={styles.sortLabel}>
            Sorter:
          </label>
          <select
            id="sort-select"
            className={styles.sortSelect}
            value={filters.sortBy}
            onChange={(e) => onSetSortBy(e.target.value as SearchFilters['sortBy'])}
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
            <h3 className={styles.sectionTitle}>Kategorier</h3>
            <div className={styles.chipGrid}>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`${styles.chip} ${
                    filters.categories.includes(category) ? styles.chipActive : ''
                  }`}
                  onClick={() => onToggleCategory(category)}
                >
                  {category}
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
            <h3 className={styles.sectionTitle}>Minimum vurdering</h3>
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

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Eksplisitt innhold</h3>
            <div className={styles.explicitContainer}>
              <button
                className={`${styles.chip} ${
                  filters.explicit === null ? styles.chipActive : ''
                }`}
                onClick={() => onSetExplicit(null)}
              >
                Alle
              </button>
              <button
                className={`${styles.chip} ${
                  filters.explicit === false ? styles.chipActive : ''
                }`}
                onClick={() => onSetExplicit(false)}
              >
                Kun familievennlig
              </button>
              <button
                className={`${styles.chip} ${
                  filters.explicit === true ? styles.chipActive : ''
                }`}
                onClick={() => onSetExplicit(true)}
              >
                Kun eksplisitt
              </button>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className={styles.clearButton} onClick={onClearFilters}>
              Nullstill alle filtre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
