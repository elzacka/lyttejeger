import { useState, useMemo } from 'react'
import type { SearchFilters, FilterOption, DateFilter } from '../types/podcast'
import type { TabType } from './TabBar'
import { FilterSheet } from './FilterSheet'
import styles from './FilterPanel.module.css'
import sheetStyles from './FilterSheet.module.css'

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

type SheetType = 'language' | 'year' | 'category' | null

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
  const [isExpanded, setIsExpanded] = useState(true)
  const [openSheet, setOpenSheet] = useState<SheetType>(null)
  const [categorySearch, setCategorySearch] = useState('')

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories
    const search = categorySearch.toLowerCase()
    return categories.filter(cat =>
      cat.label.toLowerCase().includes(search) ||
      cat.value.toLowerCase().includes(search)
    )
  }, [categories, categorySearch])

  // Reset category search when sheet closes
  const handleCloseSheet = () => {
    setOpenSheet(null)
    setCategorySearch('')
  }

  // Current year
  const currentYear = new Date().getFullYear()

  // Generate year options (2005 to current year)
  const years = Array.from({ length: currentYear - 2004 }, (_, i) => currentYear - i)

  // Year filter handler - single year, sets both from and to
  const toggleYear = (year: number) => {
    const isSelected = filters.dateFrom?.year === year
    if (isSelected) {
      onSetDateFrom(null)
      onSetDateTo(null)
    } else {
      onSetDateFrom({ day: 1, month: 1, year })
      onSetDateTo({ day: 31, month: 12, year })
    }
  }

  // Get selected year
  const selectedYear = filters.dateFrom?.year ?? null

  // Count selected items for each filter
  const languageCount = filters.languages.length
  const yearCount = selectedYear ? 1 : 0
  const categoryCount = filters.categories.length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <fieldset className={styles.typeSelector}>
          <legend className={styles.visuallyHidden}>Velg hva du vil søke etter</legend>
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
        </fieldset>

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
          <div className={styles.filterButtons}>
            {/* Language filter button */}
            <button
              className={`${styles.filterButton} ${languageCount > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenSheet('language')}
              type="button"
            >
              <span>Språk</span>
              {languageCount > 0 && (
                <span className={styles.filterButtonBadge}>{languageCount}</span>
              )}
            </button>

            {/* Category filter button */}
            <button
              className={`${styles.filterButton} ${categoryCount > 0 ? styles.filterButtonActive : ''}`}
              onClick={() => setOpenSheet('category')}
              type="button"
            >
              <span>Kategorier</span>
              {categoryCount > 0 && (
                <span className={styles.filterButtonBadge}>{categoryCount}</span>
              )}
            </button>

            {/* Year filter button - only for episodes */}
            {activeTab === 'episodes' && (
              <button
                className={`${styles.filterButton} ${yearCount > 0 ? styles.filterButtonActive : ''}`}
                onClick={() => setOpenSheet('year')}
                type="button"
              >
                <span>År</span>
                {yearCount > 0 && (
                  <span className={styles.filterButtonBadge}>{selectedYear}</span>
                )}
              </button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button className={styles.clearButton} onClick={onClearFilters}>
              Fjern alle filtre
            </button>
          )}
        </div>
      )}

      {/* Language Sheet */}
      <FilterSheet
        isOpen={openSheet === 'language'}
        onClose={handleCloseSheet}
        title="Velg språk"
      >
        <div className={sheetStyles.optionGrid}>
          {languages.map((language) => (
            <button
              key={language}
              className={`${sheetStyles.option} ${
                filters.languages.includes(language) ? sheetStyles.optionSelected : ''
              }`}
              onClick={() => onToggleLanguage(language)}
              type="button"
            >
              {language}
            </button>
          ))}
        </div>
      </FilterSheet>

      {/* Year Sheet */}
      <FilterSheet
        isOpen={openSheet === 'year'}
        onClose={handleCloseSheet}
        title="Velg år"
      >
        <div className={sheetStyles.yearGrid}>
          {years.map((year) => (
            <button
              key={year}
              className={`${sheetStyles.yearOption} ${
                selectedYear === year ? sheetStyles.yearOptionSelected : ''
              }`}
              onClick={() => toggleYear(year)}
              type="button"
            >
              {year}
            </button>
          ))}
        </div>
      </FilterSheet>

      {/* Category Sheet with search */}
      <FilterSheet
        isOpen={openSheet === 'category'}
        onClose={handleCloseSheet}
        title="Velg kategorier"
        searchable
        searchPlaceholder="Søk i kategorier..."
        searchValue={categorySearch}
        onSearchChange={setCategorySearch}
      >
        <div className={sheetStyles.categoryList}>
          {filteredCategories.length === 0 ? (
            <p className={sheetStyles.noResults}>
              Ingen kategorier funnet for "{categorySearch}"
            </p>
          ) : (
            filteredCategories.map((category) => (
              <button
                key={category.value}
                className={`${sheetStyles.categoryOption} ${
                  filters.categories.includes(category.value) ? sheetStyles.categoryOptionSelected : ''
                }`}
                onClick={() => onToggleCategory(category.value)}
                type="button"
              >
                {category.label}
              </button>
            ))
          )}
        </div>
      </FilterSheet>
    </div>
  )
}
