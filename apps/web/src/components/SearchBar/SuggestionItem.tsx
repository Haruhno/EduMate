import React from 'react';
import styles from './SuggestionItem.module.css';

interface SuggestionItemProps {
  subject: string;
  query: string;
  onSelect: (subject: string) => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({ subject, query, onSelect }) => {
  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerHighlight = highlight.toLowerCase();
    
    if (lowerText.startsWith(lowerHighlight)) {
      return (
        <>
          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
            {text.substring(0, highlight.length)}
          </span>
          <span>{text.substring(highlight.length)}</span>
        </>
      );
    }
    
    return text;
  };

  return (
    <div className={styles.suggestionItem} onClick={() => onSelect(subject)}>
      <span className={styles.suggestionEmoji}>📚</span>
      <span className={styles.suggestionText}>
        {getHighlightedText(subject, query)}
      </span>
    </div>
  );
};

export default SuggestionItem;