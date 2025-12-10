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

  // Current date for defaults
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // Generate options
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Okt' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Des' },
  ]
  const years = Array.from({ length: currentYear - 2004 + 1 }, (_, i) => currentYear - i)

  // Helper to get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  // Helper to update date field
  const updateDateFrom = (field: 'day' | 'month' | 'year', value: number) => {
    const current = filters.dateFrom ?? { day: currentDay, month: currentMonth, year: currentYear }
    const updated = { ...current, [field]: value }
    // Clamp day to valid range for the month
    const maxDay = getDaysInMonth(updated.month, updated.year)
    if (updated.day > maxDay) updated.day = maxDay
    onSetDateFrom(updated)
  }

  const updateDateTo = (field: 'day' | 'month' | 'year', value: number) => {
    const current = filters.dateTo ?? { day: currentDay, month: currentMonth, year: currentYear }
    const updated = { ...current, [field]: value }
    const maxDay = getDaysInMonth(updated.month, updated.year)
    if (updated.day > maxDay) updated.day = maxDay
    onSetDateTo(updated)
  }

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

          {/* Date range filter */}
          <div className={styles.section}>
            <div className={styles.dateRangeContainer}>
              <div className={styles.datePicker}>
                <label className={styles.dateLabel}>Fra</label>
                <div className={styles.dateInputRow}>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateFrom?.day ?? currentDay}
                    onChange={(e) => updateDateFrom('day', parseInt(e.target.value))}
                    aria-label="Fra dag"
                  >
                    {days.map((d) => {
                      const maxDay = getDaysInMonth(
                        filters.dateFrom?.month ?? currentMonth,
                        filters.dateFrom?.year ?? currentYear
                      )
                      if (d > maxDay) return null
                      return <option key={d} value={d}>{d}</option>
                    })}
                  </select>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateFrom?.month ?? currentMonth}
                    onChange={(e) => updateDateFrom('month', parseInt(e.target.value))}
                    aria-label="Fra måned"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateFrom?.year ?? currentYear}
                    onChange={(e) => updateDateFrom('year', parseInt(e.target.value))}
                    aria-label="Fra år"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <span className={styles.dateRangeSeparator}>–</span>
              <div className={styles.datePicker}>
                <label className={styles.dateLabel}>Til</label>
                <div className={styles.dateInputRow}>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateTo?.day ?? currentDay}
                    onChange={(e) => updateDateTo('day', parseInt(e.target.value))}
                    aria-label="Til dag"
                  >
                    {days.map((d) => {
                      const maxDay = getDaysInMonth(
                        filters.dateTo?.month ?? currentMonth,
                        filters.dateTo?.year ?? currentYear
                      )
                      if (d > maxDay) return null
                      return <option key={d} value={d}>{d}</option>
                    })}
                  </select>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateTo?.month ?? currentMonth}
                    onChange={(e) => updateDateTo('month', parseInt(e.target.value))}
                    aria-label="Til måned"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className={styles.dateSelect}
                    value={filters.dateTo?.year ?? currentYear}
                    onChange={(e) => updateDateTo('year', parseInt(e.target.value))}
                    aria-label="Til år"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
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
