import { useState, useMemo } from 'react';
import type { SearchFilters, FilterOption, DateFilter, DiscoveryMode } from '../types/podcast';
import type { TabType } from './TabBar';
import { FilterSheet } from './FilterSheet';
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
  onSetDiscoveryMode: (mode: DiscoveryMode) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

type SheetType = 'language' | 'year' | 'category' | 'discovery' | null;

const discoveryModes: { value: DiscoveryMode; label: string; description: string }[] = [
  { value: 'all', label: 'Alle', description: 'Vis alle podcaster' },
  { value: 'indie', label: 'Uavhengig', description: 'Podcaster utenfor Apple/Spotify' },
  { value: 'value4value', label: 'V4V', description: 'Støtter Bitcoin/Lightning' },
];

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
  onSetDiscoveryMode,
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

  // Generate year options (2005 to current year)
  const years = Array.from({ length: currentYear - 2004 }, (_, i) => currentYear - i);

  // Year filter handler - single year, sets both from and to
  const toggleYear = (year: number) => {
    const isSelected = filters.dateFrom?.year === year;
    if (isSelected) {
      onSetDateFrom(null);
      onSetDateTo(null);
    } else {
      onSetDateFrom({ day: 1, month: 1, year });
      onSetDateTo({ day: 31, month: 12, year });
    }
  };

  // Get selected year
  const selectedYear = filters.dateFrom?.year ?? null;

  // Count selected items for each filter
  const languageCount = filters.languages.length;
  const yearCount = selectedYear ? 1 : 0;
  const categoryCount = filters.categories.length;
  const discoveryLabel =
    discoveryModes.find((m) => m.value === filters.discoveryMode)?.label || 'Alle';

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

          {activeTab === 'podcasts' && (
            <button
              className={`${styles.filterChip} ${filters.discoveryMode !== 'all' ? styles.filterChipActive : ''}`}
              onClick={() => setOpenSheet('discovery')}
              type="button"
              style={{ minWidth: FILTER_CHIP_WIDTH }}
            >
              {filters.discoveryMode !== 'all' ? discoveryLabel : 'Oppdage'}
            </button>
          )}

          {activeTab === 'episodes' && (
            <button
              className={`${styles.filterChip} ${yearCount > 0 ? styles.filterChipActive : ''}`}
              onClick={() => setOpenSheet('year')}
              type="button"
              style={{ minWidth: FILTER_CHIP_WIDTH }}
            >
              {yearCount > 0 ? selectedYear : 'År'}
            </button>
          )}

          {activeFilterCount > 0 && (
            <button className={styles.clearChip} onClick={onClearFilters} type="button">
              Nullstill
            </button>
          )}
        </div>
      </div>

      {/* Language Sheet */}
      <FilterSheet isOpen={openSheet === 'language'} onClose={handleCloseSheet} title="Velg språk">
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
      <FilterSheet isOpen={openSheet === 'year'} onClose={handleCloseSheet} title="Velg år">
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

      {/* Discovery Mode Sheet */}
      <FilterSheet
        isOpen={openSheet === 'discovery'}
        onClose={handleCloseSheet}
        title="Oppdagelsesmodus"
      >
        <div className={sheetStyles.optionGrid}>
          {discoveryModes.map((mode) => (
            <button
              key={mode.value}
              className={`${sheetStyles.discoveryOption} ${
                filters.discoveryMode === mode.value ? sheetStyles.optionSelected : ''
              }`}
              onClick={() => {
                onSetDiscoveryMode(mode.value);
                handleCloseSheet();
              }}
              type="button"
            >
              <span className={sheetStyles.discoveryLabel}>{mode.label}</span>
              <span className={sheetStyles.discoveryDescription}>{mode.description}</span>
            </button>
          ))}
        </div>
      </FilterSheet>
    </div>
  );
}
