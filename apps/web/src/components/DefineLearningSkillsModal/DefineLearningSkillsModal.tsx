import React, { useRef, useState, useEffect } from 'react';
import styles from './DefineLearningSkillsModal.module.css';
import { allSkills } from '../../data/skillsData';

interface DefineLearningSkillsModalProps {
  currentSkills: string[]; // Compétences actuelles de l'utilisateur
  onClose: () => void;
  onSave: (skills: string[]) => void;
}

// Composant pour le message de succès
const SuccessModal: React.FC<{
  message: string;
  onClose: () => void;
}> = ({ message, onClose }) => (
  <div className={styles.successModalOverlay} onClick={onClose}>
    <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.successModalContent}>
        <div className={styles.successIcon}>✓</div>
        <h4>Succès !</h4>
        <p>{message}</p>
        <button 
          type="button" 
          onClick={onClose} 
          className={styles.successButton}
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
);

const DefineLearningSkillsModal: React.FC<DefineLearningSkillsModalProps> = ({
  currentSkills,
  onClose,
  onSave
}) => {
  const [skills, setSkills] = useState<string[]>(currentSkills || []);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fermer les suggestions quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fermer automatiquement le message de succès après 3 secondes
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Gestion des touches clavier
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleAddSkill(suggestions[selectedIndex]);
        } else if (inputValue.trim() && !skills.includes(inputValue.trim())) {
          handleAddSkill(inputValue.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleAddSkill = (skill: string) => {
    if (!skills.includes(skill) && skill.trim()) {
      const newSkills = [...skills, skill.trim()];
      setSkills(newSkills);
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleAddManualSkill = () => {
    if (!inputValue.trim()) return;
    
    const skill = inputValue.trim();
    if (!skills.includes(skill)) {
      const newSkills = [...skills, skill];
      setSkills(newSkills);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    const newSkills = skills.filter(s => s !== skill);
    setSkills(newSkills);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedIndex(-1);
    
    if (value.trim()) {
      const searchTerm = value.toLowerCase();
      
      const startsWithMatches = allSkills.filter(skill =>
        skill.toLowerCase().startsWith(searchTerm) &&
        !skills.includes(skill)
      ).sort((a, b) => a.localeCompare(b));

      const includesMatches = allSkills.filter(skill =>
        skill.toLowerCase().includes(searchTerm) &&
        !skill.toLowerCase().startsWith(searchTerm) &&
        !skills.includes(skill)
      ).sort((a, b) => a.localeCompare(b));

      const filtered = [...startsWithMatches, ...includesMatches].slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSave = () => {
    if (skills.length === 0) {
      setSuccessMessage('Veuillez ajouter au moins une compétence avant d\'enregistrer.');
      setShowSuccessModal(true);
      return;
    }
    
    // Appeler la fonction parent pour sauvegarder
    onSave(skills);
    
    // Afficher le message de succès
    const skillCount = skills.length;
    const message = skillCount === 1 
      ? '1 compétence a été enregistrée avec succès !' 
      : `${skillCount} compétences ont été enregistrées avec succès !`;
    
    setSuccessMessage(message);
    setShowSuccessModal(true);
    
    // Fermer le modal principal après un délai
    setTimeout(() => {
      onClose();
    }, 2000); // Ferme après 2 secondes
  };

  // Fonction pour mettre en évidence le texte correspondant
  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerSearch = search.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerSearch);

    if (matchIndex === -1) return text;

    const before = text.substring(0, matchIndex);
    const match = text.substring(matchIndex, matchIndex + search.length);
    const after = text.substring(matchIndex + search.length);

    return (
      <>
        {before}
        <strong style={{ color: '#4a90e2' }}>{match}</strong>
        {after}
      </>
    );
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Définir les compétences que vous voulez acquérir</h2>
            <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">✕</button>
          </div>

          <div className={styles.modalBody}>
            <p className={styles.helpText}>
              Ajoutez les compétences que vous souhaitez apprendre ou développer.
            </p>
            
            <div className={styles.inputWrapper}>
              <div className={styles.inputContainer}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    handleInputKeyDown(e);
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualSkill();
                    }
                  }}
                  onFocus={() => {
                    if (inputValue.trim()) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Ex: Python, Marketing digital, Guitare..."
                  className={styles.skillsInput}
                  autoFocus
                />
                
                {/* Suggestions positionnées sous l'input */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className={styles.suggestions} ref={suggestionsRef}>
                    {suggestions.map((skill, index) => (
                      <div
                        key={index}
                        className={`${styles.suggestion} ${index === selectedIndex ? styles.selected : ''}`}
                        onClick={() => handleAddSkill(skill)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {highlightMatch(skill, inputValue)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={styles.actionButtons}>
                <button 
                  type="button" 
                  onClick={handleAddManualSkill} 
                  className={styles.addButton} 
                  disabled={!inputValue.trim()}
                  title="Ajouter cette compétence"
                >
                  Ajouter
                </button>
              </div>
            </div>
            
            {/* Compétences sélectionnées */}
            <div className={styles.selectedSkills}>
              {skills.map((skill, index) => (
                <span key={index} className={`${styles.skillTag} ${styles.learnSkillTag}`}>
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className={styles.removeTag}
                  >
                    ×
                  </button>
                </span>
              ))}
              
              {skills.length === 0 && (
                <p className={styles.noSkillsMessage}>
                  Aucune compétence ajoutée. Tapez une compétence et cliquez sur "Ajouter".
                </p>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button onClick={onClose} className={styles.secondaryButton}>
              Annuler
            </button>
            <button onClick={handleSave} className={styles.primaryButton}>
              Enregistrer {skills.length} compétence(s)
            </button>
          </div>
        </div>
      </div>

      {/* Modal de succès */}
      {showSuccessModal && (
        <SuccessModal 
          message={successMessage} 
          onClose={() => setShowSuccessModal(false)} 
        />
      )}
    </>
  );
};

export default DefineLearningSkillsModal;