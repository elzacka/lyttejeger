import { useState, useRef, useEffect } from 'react'
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
  onSetDateFrom: (year: number | null) => void
  onSetDateTo: (year: number | null) => void
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
  onSetDateFrom,
  onSetDateTo,
  onSetSortBy,
  onClearFilters,
  activeFilterCount
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate year options (from 2004 when podcasting started to current year)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2004 + 1 }, (_, i) => currentYear - i)

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
            <option value="newest">Nyeste</option>
            <option value="oldest">Eldste</option>
            <option value="popular">Populære</option>
          </select>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.panel}>
          {/* Språk - first */}
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

          {/* Kategorier - dropdown with multiselect */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Kategorier</h3>
            <div className={styles.dropdownContainer} ref={categoryDropdownRef}>
              <button
                className={styles.dropdownButton}
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                aria-expanded={categoryDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className={styles.dropdownText}>
                  {filters.categories.length === 0
                    ? 'Velg kategorier'
                    : `${filters.categories.length} valgt`}
                </span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {categoryDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {categoryDropdownOpen && (
                <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true">
                  {categories.map((category) => {
                    const isSelected = filters.categories.includes(category.value)
                    return (
                      <button
                        key={category.value}
                        className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemSelected : ''}`}
                        onClick={() => onToggleCategory(category.value)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className={styles.checkbox}>
                          {isSelected && (
                            <span className="material-symbols-outlined" aria-hidden="true">check</span>
                          )}
                        </span>
                        {category.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Show selected categories as chips below dropdown */}
              {filters.categories.length > 0 && (
                <div className={styles.selectedChips}>
                  {filters.categories.map((catValue) => {
                    const category = categories.find(c => c.value === catValue)
                    return (
                      <button
                        key={catValue}
                        className={styles.selectedChip}
                        onClick={() => onToggleCategory(catValue)}
                        aria-label={`Fjern ${category?.label || catValue}`}
                      >
                        {category?.label || catValue}
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Date range filter */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Periode</h3>
            <div className={styles.dateRangeContainer}>
              <select
                className={styles.yearSelect}
                value={filters.dateFrom ?? ''}
                onChange={(e) => onSetDateFrom(e.target.value ? parseInt(e.target.value) : null)}
                aria-label="Fra år"
              >
                <option value="">Fra</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className={styles.dateRangeSeparator}>–</span>
              <select
                className={styles.yearSelect}
                value={filters.dateTo ?? ''}
                onChange={(e) => onSetDateTo(e.target.value ? parseInt(e.target.value) : null)}
                aria-label="Til år"
              >
                <option value="">Til</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
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
