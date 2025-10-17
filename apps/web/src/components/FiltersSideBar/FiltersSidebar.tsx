import React from 'react';
import styles from './FiltersSidebar.module.css';

interface Filters {
  level: string;
  priceRange: [number, number];
  rating: number;
  availability: string;
  teachingMode: string;
  location: string;
}

interface FiltersSidebarProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  handleSearch: () => void;
  handleReset: () => void;
  loading: boolean;
  levels: string[];
  teachingModes: string[];
  availabilityOptions: string[];
  isMobile?: boolean;
}

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filters,
  setFilters,
  handleSearch,
  handleReset,
  loading,
  levels,
  teachingModes,
  isMobile = false
}) => {
  return (
    <div className={`${styles.filtersSidebar} ${isMobile ? styles.mobile : ''}`}>
      <div className={styles.filtersContent}>
        <div className={styles.filtersHeader}>
          <h2>Filtres</h2>
          <button onClick={handleReset} className={styles.resetFilters}>
            Tout effacer
          </button>
        </div>

        <div className={styles.filtersGroups}>
          {/* Niveau */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Niveau</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({...filters, level: e.target.value})}
              className={styles.filterSelect}
            >
              <option value="">Tous les niveaux</option>
              {levels.map((level: string) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Prix*/}
          <div className={styles.filterGroup}>
            <div className={styles.priceHeader}>
              <label className={styles.filterLabel}>Tarif maximum</label>
              <span className={styles.priceValue}>{filters.priceRange[1]} €/h</span>
            </div>
            
            <div className={styles.priceSliderContainer}>
              <div className={styles.priceSliderBackground}></div>
              <div 
                className={styles.priceSliderProgress}
                style={{ width: `${(filters.priceRange[1] - 7) / (100 - 7) * 100}%` }}
              ></div>
              <div 
                className={styles.priceSliderThumb}
                style={{ left: `${(filters.priceRange[1] - 7) / (100 - 7) * 100}%` }}
              ></div>
              <input
                type="range"
                min="7"
                max="100"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({...filters, priceRange: [7, parseInt(e.target.value)]})}
                className={styles.priceSliderInput}
              />
            </div>
            
            <div className={styles.priceRangeLabels}>
              <span>7 €</span>
              <span>100 €</span>
            </div>
          </div>
      
          {/* Note minimum */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Note minimum</label>
            <div className={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star: number) => (
                <button
                  key={star}
                  onClick={() => setFilters({...filters, rating: star})}
                  className={`${styles.starButton} ${star <= filters.rating ? styles.active : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Mode d'enseignement */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Mode d'enseignement</label>
            <div className={styles.radioGroup}>
              {teachingModes.map((mode: string) => (
                <label key={mode} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="teachingMode"
                    value={mode}
                    checked={filters.teachingMode === mode}
                    onChange={(e) => setFilters({...filters, teachingMode: e.target.value})}
                  />
                  <span>{mode}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Localisation */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Localisation</label>
            <input
              type="text"
              placeholder="Ville ou code postal"
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className={styles.filterInput}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className={styles.searchButton}
          >
            {loading ? 'Recherche en cours...' : 'Appliquer les filtres'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersSidebar;