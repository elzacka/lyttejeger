import { useState, useRef, useEffect } from 'react'
import type { SearchFilters, FilterOption, DateFilter } from '../types/podcast'
import type { TabType } from './TabBar'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  filters: SearchFilters
  categories: FilterOption[]
  languages: string[]
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onToggleCategory: (category: string) => void
  onToggleLanguage: (language: string) => void
  onSetDateFrom: (date: DateFilter | null) => void
  onSetDateTo: (date: DateFilter | null) => void
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
  onClearFilters,
  activeFilterCount
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Close category dropdown when clicking outside
  useEffect(() => {
    if (!isCategoryOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCategoryOpen])

  // Current year
  const currentYear = new Date().getFullYear()

  // Generate year options (2005 to current year)
  const years = Array.from({ length: currentYear - 2004 }, (_, i) => currentYear - i)

  // Year filter handlers
  const setYearFrom = (year: number | null) => {
    if (year === null) {
      onSetDateFrom(null)
    } else {
      onSetDateFrom({ day: 1, month: 1, year })
    }
  }

  const setYearTo = (year: number | null) => {
    if (year === null) {
      onSetDateTo(null)
    } else {
      onSetDateTo({ day: 31, month: 12, year })
    }
  }

  // Get selected years
  const yearFrom = filters.dateFrom?.year ?? null
  const yearTo = filters.dateTo?.year ?? null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.typeSelector} role="radiogroup" aria-label="Velg hva du vil søke etter">
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="searchType"
              value="podcasts"
              checked={activeTab === 'podcasts'}
              onChange={() => onTabChange('podcasts')}
              className={styles.radioInput}
            />
            <span className={styles.radioText}>Podcaster</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="searchType"
              value="episodes"
              checked={activeTab === 'episodes'}
              onChange={() => onTabChange('episodes')}
              className={styles.radioInput}
            />
            <span className={styles.radioText}>Episoder</span>
          </label>
        </div>

        <button
          className={styles.filterDropdown}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-haspopup="true"
        >
          <span className={styles.filterDropdownText}>
            Filtre
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </span>
          <span className="material-symbols-outlined" aria-hidden="true">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div className={styles.panel}>
          {/* Språk */}
          <div className={styles.section}>
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

          {/* Kategorier */}
          <div className={styles.section}>
            <div className={styles.categoryContainer} ref={categoryDropdownRef}>
              <button
                className={styles.categorySelect}
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                aria-expanded={isCategoryOpen}
                aria-haspopup="listbox"
                aria-label="Velg kategori"
                type="button"
              >
                <span>
                  {filters.categories.length === 0
                    ? 'Velg kategorier'
                    : `${filters.categories.length} valgt`}
                </span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isCategoryOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isCategoryOpen && (
                <div className={styles.categoryDropdown} role="listbox">
                  {categories.map((category) => {
                    const isSelected = filters.categories.includes(category.value)
                    return (
                      <button
                        key={category.value}
                        className={`${styles.categoryOption} ${isSelected ? styles.categoryOptionSelected : ''}`}
                        onClick={() => onToggleCategory(category.value)}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                      >
                        <span className={styles.categoryCheckbox}>
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

              {/* Show selected categories as chips below */}
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
                        type="button"
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

          {/* Year filter - only for episodes */}
          {activeTab === 'episodes' && (
            <div className={styles.section}>
              <div className={styles.yearFilterContainer}>
                <div className={styles.yearFilterRow}>
                  <span className={styles.yearLabel}>Fra</span>
                  <div className={styles.yearChips}>
                    {years.slice(0, 8).map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`${styles.yearChip} ${yearFrom === year ? styles.yearChipActive : ''}`}
                        onClick={() => setYearFrom(yearFrom === year ? null : year)}
                        aria-pressed={yearFrom === year}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.yearFilterRow}>
                  <span className={styles.yearLabel}>Til</span>
                  <div className={styles.yearChips}>
                    {years.slice(0, 8).map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`${styles.yearChip} ${yearTo === year ? styles.yearChipActive : ''}`}
                        onClick={() => setYearTo(yearTo === year ? null : year)}
                        aria-pressed={yearTo === year}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
