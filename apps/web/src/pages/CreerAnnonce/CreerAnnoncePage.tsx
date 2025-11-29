import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreerAnnoncePage.module.css';
import authService from '../../services/authService';
import annonceService from '../../services/annonceService';

interface AnnonceQuestion {
  id: string;
  question: string;
  type: 'specialties' | 'multi-select' | 'slider' | 'confirmation';
  options?: string[];
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface SpecialtiesInputProps {
  onSelect: (value: string[]) => void;
  initialValue?: string[];
}

interface PriceSliderProps {
  question: AnnonceQuestion;
  value: number;
  onChange: (value: number) => void;
}

// Composant SpecialtiesInput corrigé
const SpecialtiesInput: React.FC<SpecialtiesInputProps> = ({
  onSelect,
  initialValue = []
}) => {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(initialValue);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableSpecialties = [
    "Allemand", "Anglais", "Arabe", "Archéologie", "Architecture",
    "Arts", "Arts plastiques", "Biologie", "Chimie", "Chinois", "Commerce International",
    "Communication", "Comptabilité", "Culture générale", "Dessin",
    "Droit", "Économie", "Éducation civique", "Électrotechnique",
    "Espagnol", "Finance", "Français", "Géographie", "Gestion",
    "Graphisme", "Histoire", "Histoire-Géographie", "Histoire de l'art",
    "Informatique", "Italien", "Japonais", "Latin", "Littérature",
    "Marketing", "Management et gestion des entreprises", "Mathématiques", "Mécanique", "Médecine", "Méthodologie", "Musique",
    "Philosophie", "Physique", "Portugais", "Programmation",
    "Psychologie", "Russe", "SES", "SVT", "Sciences de l'ingénieur",
    "Sciences politiques", "Sociologie", "Statistiques", "Sport",
    "Théâtre", "Électronique", "Génie civil", "Génie électrique",
    "Génie mécanique", "Biochimie", "Géologie", "Astronomie",
    "Écologie", "Bureautique", "Rédaction", "Préparation aux concours",
    "Aide aux devoirs", "Méthodologie", "Orientation scolaire",
    "Soutien scolaire", "Russe", "Néerlandais", "Coréen"
  ].sort();

  const INITIAL_DISPLAY_COUNT = 9;
  const displayedSpecialties = showAllSpecialties 
    ? availableSpecialties 
    : availableSpecialties.slice(0, INITIAL_DISPLAY_COUNT);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateSelectedSpecialties = useCallback((newSpecialties: string[]) => {
    setSelectedSpecialties(newSpecialties);
    onSelect(newSpecialties);
  }, [onSelect]);

  const handleAddSpecialty = (specialty: string) => {
    if (!selectedSpecialties.includes(specialty)) {
      const newSpecialties = [...selectedSpecialties, specialty];
      updateSelectedSpecialties(newSpecialties);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter(s => s !== specialty);
    updateSelectedSpecialties(newSpecialties);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      const searchTerm = value.toLowerCase();
      const startsWithMatches = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().startsWith(searchTerm) &&
        !selectedSpecialties.includes(specialty)
      );
      const includesMatches = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().includes(searchTerm) &&
        !specialty.toLowerCase().startsWith(searchTerm) &&
        !selectedSpecialties.includes(specialty)
      );
      const filtered = [...startsWithMatches, ...includesMatches].slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !availableSpecialties.includes(inputValue)) {
      handleAddSpecialty(inputValue.trim());
    }
  };

  const handleSpecialtyClick = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      handleRemoveSpecialty(specialty);
    } else {
      handleAddSpecialty(specialty);
    }
  };

  const toggleShowAll = () => {
    setShowAllSpecialties(!showAllSpecialties);
  };

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
        <strong style={{ color: '#FBBF24' }}>{match}</strong>
        {after}
      </>
    );
  };

  return (
    <div className={styles.specialtiesContainer}>
      <p className={styles.helpText}>
        Cliquez sur les matières pour les sélectionner. <br />Vous pouvez aussi en ajouter de nouvelles en les tapant.
      </p>

      <div className={styles.inputWrapper} ref={inputRef}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(true)}
          placeholder="Rechercher une matière..."
          className={styles.specialtiesInput}
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((specialty, index) => (
              <div
                key={index}
                className={styles.suggestion}
                onClick={() => handleAddSpecialty(specialty)}
              >
                {highlightMatch(specialty, inputValue)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.selectedSpecialties}>
        {selectedSpecialties.map((specialty, index) => (
          <span key={index} className={styles.specialtyTag}>
            {specialty}
            <button
              onClick={() => handleRemoveSpecialty(specialty)}
              className={styles.removeTag}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className={styles.specialtiesGrid}>
        {displayedSpecialties.map((specialty, index) => (
          <button
            key={index}
            className={`${styles.specialtyButton} ${
              selectedSpecialties.includes(specialty) ? styles.selected : ''
            }`}
            onClick={() => handleSpecialtyClick(specialty)}
          >
            {specialty}
            {selectedSpecialties.includes(specialty) && (
              <span className={styles.checkmark}>✓</span>
            )}
          </button>
        ))}
      </div>

      {availableSpecialties.length > INITIAL_DISPLAY_COUNT && (
        <div className={styles.showMoreContainer}>
          <button
            onClick={toggleShowAll}
            className={styles.showMoreButton}
          >
            {showAllSpecialties ? 'Afficher moins' : `Afficher plus (${availableSpecialties.length - INITIAL_DISPLAY_COUNT} autres)`}
            <svg 
              className={`${styles.showMoreIcon} ${showAllSpecialties ? styles.rotated : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

const PriceSlider: React.FC<PriceSliderProps> = ({ question, value, onChange }) => {
  const minValue = question.min ?? 15;
  const maxValue = question.max ?? 100;
  const stepValue = 1;
  
  // Utilisez useRef pour suivre si c'est le rendu initial
  const initialValueRef = useRef(value || minValue);
  const currentValue = value !== undefined ? value : initialValueRef.current;
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue.toString());
  const [error, setError] = useState<string | null>(null);

  // Synchronisation uniquement quand la valeur externe change
  useEffect(() => {
    if (value !== undefined && value !== currentValue) {
      setInputValue(value.toString());
      setError(null);
    }
  }, [value]);

  const handlePriceClick = () => {
    setIsEditing(true);
    setInputValue(currentValue.toString());
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value === '') {
      setError(null);
      return;
    }
    
    const numericValue = parseInt(value);
    
    if (isNaN(numericValue)) {
      setError('Veuillez entrer un nombre valide');
      return;
    }
    
    if (numericValue < minValue) {
      setError(`Le tarif ne doit pas être inférieur à ${minValue} €`);
      return;
    }
    
    if (numericValue > maxValue) {
      setError(`Le tarif ne peut pas être supérieur à ${maxValue} €`);
      return;
    }
    
    onChange(numericValue);
    setError(null);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    
    if (inputValue === '') {
      setInputValue(currentValue.toString());
      setError(null);
      return;
    }
    
    const numericValue = parseInt(inputValue);
    
    if (isNaN(numericValue)) {
      setInputValue(currentValue.toString());
      setError(null);
      return;
    }
    
    if (numericValue < minValue) {
      onChange(minValue);
      setInputValue(minValue.toString());
      setError(null);
      return;
    }
    
    if (numericValue > maxValue) {
      onChange(maxValue);
      setInputValue(maxValue.toString());
      setError(null);
      return;
    }
    
    onChange(numericValue);
    setError(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={styles.priceContainer}>
      <div className={styles.priceHeader}>
        {isEditing ? (
          <div className={styles.priceInputWrapper}>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className={`${styles.priceInput} ${error ? styles.inputError : ''}`}
              autoFocus
              min={minValue}
              max={maxValue}
            />
            <span className={styles.priceInputSuffix}>€/h</span>
          </div>
        ) : (
          <div className={styles.priceDisplay}>
            <span 
              className={styles.priceValue}
              onClick={handlePriceClick}
            >
              {currentValue}
            </span>
            <span className={styles.priceUnit}>€/h</span>
          </div>
        )}
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.priceSliderContainer}>
        <div className={styles.priceSliderBackground}></div>
        <div 
          className={styles.priceSliderProgress}
          style={{ width: `${((currentValue - minValue) / (maxValue - minValue)) * 100}%` }}
        ></div>
        <div 
          className={styles.priceSliderThumb}
          style={{ left: `${((currentValue - minValue) / (maxValue - minValue)) * 100}%` }}
        ></div>
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={stepValue}
          value={currentValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={styles.priceSliderInput}
        />
      </div>
      
      <div className={styles.priceRangeLabels}>
        <span>{minValue} €</span>
        <span>{maxValue} €</span>
      </div>
    </div>
  );
};

const CreerAnnoncePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Questions identiques à DevenirTuteur
  const annonceQuestions: AnnonceQuestion[] = [
    {
      id: 'subjects',
      question: "Dans quelle matière souhaitez-vous donner des cours ?",
      type: 'specialties',
      field: 'subjects'
    },
    {
      id: 'levels',
      question: "À quel(s) niveau(x) voulez-vous enseigner ?",
      type: 'multi-select',
      options: [
        "Tous niveaux",
        "Primaire",
        "Collège", 
        "Lycée",
        "Prépa",
        "Licence",
        "Master",
        "Doctorat"
      ],
      field: 'level'
    },
    {
      id: 'rate',
      question: "Quel tarif horaire proposez-vous ?",
      type: 'slider',
      field: 'hourlyRate',
      min: 15,
      max: 100,
      step: 5
    },
    {
      id: 'confirmation',
      question: "Souhaitez-vous créer cette annonce ?",
      type: 'confirmation'
    }
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate('/connexion');
      return;
    }

    if (currentUser.role !== 'tutor') {
      navigate('/devenir-tuteur');
      return;
    }
  }, [navigate]);

  const handleAnswer = (answer: any) => {
    const currentQuestion = annonceQuestions[currentStep];
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentStep < annonceQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const subjects = Array.isArray(answers.subjects) ? answers.subjects : [answers.subjects || 'Tutorat général'];
      const primarySubject = subjects[0];
      
      const annonceData = {
        title: `Cours de ${primarySubject}`,
        description: `Cours personnalisé de ${subjects.join(', ')} pour niveau ${Array.isArray(answers.levels) ? answers.levels.join(', ') : answers.levels}`,
        subject: primarySubject, 
        subjects: subjects,
        level: Array.isArray(answers.levels) ? answers.levels.join(', ') : answers.levels || 'Tous niveaux',
        hourlyRate: answers.rate || 30,
        teachingMode: 'Les deux',
        location: {
          address: '',
          city: '',
          coordinates: { lat: 0, lng: 0 }
        },
        availability: {
          days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
          timeSlots: ['09:00-12:00', '14:00-18:00']
        }
      };

      const response = await annonceService.createAnnonce(annonceData);

      if (response.success) {
        navigate('/annonces', { 
          state: { 
            message: 'Votre annonce a été créée avec succès !' 
          }
        });
      }
    } catch (error) {
      console.error('Erreur création annonce:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / annonceQuestions.length) * 100;
  };

  const canProceed = () => {
    const currentQuestion = annonceQuestions[currentStep];
    const answer = answers[currentQuestion.id];
    
    if (!answer) return false;
    
    switch (currentQuestion.type) {
      case 'specialties':
        return Array.isArray(answer) && answer.length > 0;
      case 'multi-select':
        return Array.isArray(answer) && answer.length > 0;
      case 'slider':
        return typeof answer === 'number' && !isNaN(answer);
      case 'confirmation':
        return true;
      default:
        return !!answer;
    }
  };

  const renderQuestion = (question: AnnonceQuestion) => {
    switch (question.type) {
      case 'specialties':
        return (
          <SpecialtiesInput
            onSelect={(value: string[]) => handleAnswer(value)}
            initialValue={answers[question.id]}
          />
        );

      case 'multi-select':
        return (
          <div className={styles.optionsGrid}>
            {question.options?.map((option, index) => {
              const currentAnswers: string[] = answers[question.id] || [];
              const isSelected = Array.isArray(currentAnswers) && currentAnswers.includes(option);
              
              return (
                <button
                  key={index}
                  className={`${styles.optionButton} ${
                    isSelected ? styles.selected : ''
                  }`}
                  onClick={() => {
                    const currentAnswers: string[] = answers[question.id] || [];
                    let newAnswers: string[];
                    
                    if (option === "Tous niveaux") {
                      newAnswers = ["Tous niveaux"];
                    } else if (Array.isArray(currentAnswers) && currentAnswers.includes(option)) {
                      newAnswers = currentAnswers.filter((item: string) => item !== option && item !== "Tous niveaux");
                    } else {
                      newAnswers = [...currentAnswers.filter((item: string) => item !== "Tous niveaux"), option];
                    }
                    
                    handleAnswer(newAnswers);
                  }}
                >
                  <span className={styles.optionText}>{option}</span>
                  {isSelected && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'slider':
        return (
          <PriceSlider
            question={question}
            value={answers[question.id] || 30}
            onChange={(value: number) => handleAnswer(value)}
          />
        );        

      case 'confirmation':
        return (
          <div className={styles.confirmationSection}>
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>
                Création d'annonce - Récapitulatif
              </h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Matières:</span>
                  <span className={styles.summaryValue}>
                    {Array.isArray(answers.subjects) 
                      ? answers.subjects.join(', ') 
                      : answers.subjects || 'Non spécifié'}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Niveaux enseignés:</span>
                  <span className={styles.summaryValue}>
                    {Array.isArray(answers.levels) 
                      ? answers.levels.join(', ') 
                      : answers.levels || 'Non spécifié'}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Tarif horaire:</span>
                  <span className={styles.summaryValue}>€{answers.rate || '30'}/heure</span>
                </div>
              </div>
            </div>
            
            <div className={styles.confirmationOptions}>
              <button
                className={styles.confirmButton}
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner}></div>
                    Création...
                  </>
                ) : (
                  'Créer mon annonce'
                )}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => navigate('/annonces')}
              >
                Annuler
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement...</div>
      </div>
    );
  }

  const currentQuestion = annonceQuestions[currentStep];

  return (
    <div className={styles.container}>
      {/* Barre de progression */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${getProgressPercentage()}%` }}
        ></div>
      </div>

      {/* En-tête avec information du statut */}
      <div className={styles.statusHeader}>
        <div className={styles.statusInfo}>
          <span className={styles.statusBadge}>Tuteur</span>
          <p className={styles.statusText}>
            Création d'une <strong>nouvelle annonce</strong>
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {currentQuestion.type !== 'confirmation' ? (
          <>
            <div className={styles.questionSection}>
              <div className={styles.questionHeader}>
                <h1 className={styles.question}>
                  {currentQuestion.question}
                </h1>
                <div className={styles.stepIndicator}>
                  Étape {currentStep + 1} sur {annonceQuestions.length}
                </div>
              </div>

              {renderQuestion(currentQuestion)}

              {/* Boutons de navigation */}
              <div className={styles.navigationButtons}>
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`${styles.backButton} ${
                    currentStep === 0 ? styles.disabled : ''
                  }`}
                >
                  <svg className={styles.backIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour
                </button>

                {currentStep < annonceQuestions.length - 1 && (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`${styles.nextButton} ${
                      !canProceed() ? styles.disabled : ''
                    }`}
                  >
                    Suivant
                    <svg className={styles.nextIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Indicateurs de progression */}
            <div className={styles.progressDots}>
              {annonceQuestions.map((_, index) => (
                <div
                  key={index}
                  className={`${styles.dot} ${
                    index === currentStep ? styles.active : 
                    index < currentStep ? styles.completed : ''
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.confirmationView}>
            {renderQuestion(annonceQuestions[annonceQuestions.length - 1])}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreerAnnoncePage;