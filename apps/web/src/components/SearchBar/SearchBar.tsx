import React from 'react';
import styles from './SearchBar.module.css';
import SuggestionItem from './SuggestionItem';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  filteredSubjects: string[];
  handleSubjectSelect: (subject: string) => void;
  handleQuickSearch: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  showSuggestions,
  setShowSuggestions,
  filteredSubjects,
  handleSubjectSelect,
  handleQuickSearch,
  handleKeyPress,
  searchInputRef
}) => {
  return (
    <div className={styles.quickSearch}>
      <div className={styles.searchWithSuggestions}>
        <div className={styles.searchInputWrapper} ref={searchInputRef}>
          <input
            type="text"
            placeholder="Rechercher une matière (ex: Mathématiques, Physique...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onFocus={() => {
              if (searchQuery.trim() && filteredSubjects.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyPress={handleKeyPress}
            className={styles.searchInput}
          />
          
          <button 
            onClick={handleQuickSearch}
            className={styles.searchInputButton}
          >
            🔍
          </button>
          
          {/* Le dropdown doit être DIRECTEMENT dans searchInputWrapper */}
          {showSuggestions && searchQuery && filteredSubjects.length > 0 && (
            <div className={styles.suggestionsDropdown}>
              {filteredSubjects.map((subject: string, index: number) => (
                <SuggestionItem
                  key={index}
                  subject={subject}
                  query={searchQuery}
                  onSelect={handleSubjectSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;