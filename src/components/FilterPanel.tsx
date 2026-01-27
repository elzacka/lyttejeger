import { useState, useMemo } from 'react';
import type { SearchFilters, FilterOption, DateFilter } from '../types/podcast';
import type { TabType } from './TabBar';
import { FilterSheet } from './FilterSheet';
import { YearRangeSlider } from './YearRangeSlider';
import styles from './FilterPanel.module.css';
import sheetStyles from './FilterSheet.module.css';

interface FilterPanelProps {
  filters: SearchFilters;
  categories: FilterOption[];
  languages: string[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onToggleCategory: (category: string) => void;
  onToggleLanguage: (language: string) => void;
  onSetDateFrom: (date: DateFilter | null) => void;
  onSetDateTo: (date: DateFilter | null) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

type SheetType = 'language' | 'year' | 'category' | null;

// Fixed width for filter chips to ensure consistent sizing
const FILTER_CHIP_WIDTH = '5.5rem'; // Based on "Kategori" width

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
  activeFilterCount,
}: FilterPanelProps) {
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [categorySearch, setCategorySearch] = useState('');

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const search = categorySearch.toLowerCase();
    return categories.filter(
      (cat) => cat.label.toLowerCase().includes(search) || cat.value.toLowerCase().includes(search)
    );
  }, [categories, categorySearch]);

  // Reset category search when sheet closes
  const handleCloseSheet = () => {
    setOpenSheet(null);
    setCategorySearch('');
  };

  // Current year
  const currentYear = new Date().getFullYear();

  // Year range: 2010 to current year (2026)
  const MIN_YEAR = 2010;
  const MAX_YEAR = currentYear;

  // Year range handler - allows selecting from/to years
  const handleYearRangeChange = (fromYear: number, toYear: number) => {
    onSetDateFrom({ day: 1, month: 1, year: fromYear });
    onSetDateTo({ day: 31, month: 12, year: toYear });
  };

  // Get selected year range
  const selectedFromYear = filters.dateFrom?.year ?? null;
  const selectedToYear = filters.dateTo?.year ?? null;

  // Count selected items for each filter
  const languageCount = filters.languages.length;
  const yearCount = selectedFromYear || selectedToYear ? 1 : 0;
  const categoryCount = filters.categories.length;

  // Display text for year button
  const yearButtonText = useMemo(() => {
    if (!selectedFromYear && !selectedToYear) return 'År';
    if (selectedFromYear === selectedToYear) return `${selectedFromYear}`;
    return `${selectedFromYear}–${selectedToYear}`;
  }, [selectedFromYear, selectedToYear]);

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

        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterChip} ${languageCount > 0 ? styles.filterChipActive : ''}`}
            onClick={() => setOpenSheet('language')}
            type="button"
            style={{ minWidth: FILTER_CHIP_WIDTH }}
          >
            Språk{languageCount > 0 && ` (${languageCount})`}
          </button>

          <button
            className={`${styles.filterChip} ${categoryCount > 0 ? styles.filterChipActive : ''}`}
            onClick={() => setOpenSheet('category')}
            type="button"
            style={{ minWidth: FILTER_CHIP_WIDTH }}
          >
            Kategori{categoryCount > 0 && ` (${categoryCount})`}
          </button>

          {activeTab === 'episodes' && (
            <button
              className={`${styles.filterChip} ${yearCount > 0 ? styles.filterChipActive : ''}`}
              onClick={() => setOpenSheet('year')}
              type="button"
              style={{ minWidth: FILTER_CHIP_WIDTH }}
            >
              {yearButtonText}
            </button>
          )}

          {activeFilterCount > 0 && (
            <button className={styles.clearChip} onClick={onClearFilters} type="button">
              Nullstill
            </button>
          )}
        </div>
      </div>

      {/* Language Sheet - small, only a few options */}
      <FilterSheet
        isOpen={openSheet === 'language'}
        onClose={handleCloseSheet}
        title="Velg språk"
        size="small"
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

      {/* Year Sheet - vertical range slider */}
      <FilterSheet
        isOpen={openSheet === 'year'}
        onClose={handleCloseSheet}
        title="Velg år"
        size="full"
      >
        <YearRangeSlider
          minYear={MIN_YEAR}
          maxYear={MAX_YEAR}
          fromYear={selectedFromYear}
          toYear={selectedToYear}
          onChange={handleYearRangeChange}
        />
      </FilterSheet>

      {/* Category Sheet with search - full height for many categories */}
      <FilterSheet
        isOpen={openSheet === 'category'}
        onClose={handleCloseSheet}
        title="Velg kategorier"
        size="full"
        searchable
        searchPlaceholder="Søk i kategorier..."
        searchValue={categorySearch}
        onSearchChange={setCategorySearch}
      >
        <div className={sheetStyles.categoryList}>
          {filteredCategories.length === 0 ? (
            <p className={sheetStyles.noResults}>Ingen kategorier funnet for "{categorySearch}"</p>
          ) : (
            filteredCategories.map((category) => (
              <button
                key={category.value}
                className={`${sheetStyles.categoryOption} ${
                  filters.categories.includes(category.value)
                    ? sheetStyles.categoryOptionSelected
                    : ''
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
  );
}
