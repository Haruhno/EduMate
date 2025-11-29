import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DevenirTuteur.module.css';
import authService from '../../services/authService';
import profileService from '../../services/profileService';
import migrationService from '../../services/migrationService';
import annonceService from '../../services/annonceService';
import type { MigrationData } from '../../services/migrationService';

interface TutorQuestion {
  id: string;
  question: string;
  type: 'choice' | 'multi-select' | 'specialties' | 'slider' | 'confirmation';
  options?: string[];
  placeholder?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Composant pour les spécialités
interface SpecialtiesInputProps {
  onSelect: (value: string[]) => void;
  initialValue?: string[];
}

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

  // Liste complète des matières disponibles (triées par ordre alphabétique)
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

  // Nombre de spécialités à afficher initialement
  const INITIAL_DISPLAY_COUNT = 9;
  
  // Spécialités à afficher (soit les premières, soit toutes)
  const displayedSpecialties = showAllSpecialties 
    ? availableSpecialties 
    : availableSpecialties.slice(0, INITIAL_DISPLAY_COUNT);

  // Fermer les suggestions quand on clique dehors
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
      
      // D'abord les résultats qui commencent par la recherche
      const startsWithMatches = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().startsWith(searchTerm) &&
        !selectedSpecialties.includes(specialty)
      );
      
      // Ensuite les résultats qui contiennent la recherche (mais ne commencent pas par)
      const includesMatches = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().includes(searchTerm) &&
        !specialty.toLowerCase().startsWith(searchTerm) &&
        !selectedSpecialties.includes(specialty)
      );
      
      // Combiner les résultats (startsWith d'abord, puis includes)
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

      {/* Input avec autocomplétion */}
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
        
        {/* Suggestions d'autocomplétion */}
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

      {/* Liste des spécialités sélectionnées */}
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

      {/* Grille des matières populaires */}
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

      {/* Bouton Afficher plus/moins */}
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

// Composant pour le slider de prix
interface PriceSliderProps {
  question: TutorQuestion;
  value: number;
  onChange: (value: number) => void;
}

const PriceSlider: React.FC<PriceSliderProps> = ({ question, value, onChange }) => {
  // Utiliser des valeurs par défaut pour min et max
  const minValue = question.min ?? 15;
  const maxValue = question.max ?? 100;
  const stepValue = 1;
  const currentValue = value || minValue;
  
  // État pour gérer l'édition du tarif
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue.toString());
  const [error, setError] = useState<string | null>(null);

  // Synchroniser l'input avec la valeur actuelle
  useEffect(() => {
    setInputValue(currentValue.toString());
    setError(null);
  }, [currentValue]);

  const handlePriceClick = () => {
    setIsEditing(true);
    setInputValue(currentValue.toString());
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Validation en temps réel pendant la frappe
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
    
    // Si la valeur est valide, appliquer immédiatement et effacer l'erreur
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
    
    // Validation finale au blur
    if (isNaN(numericValue)) {
      // Corriger automatiquement vers la dernière valeur valide
      setInputValue(currentValue.toString());
      setError(null);
      return;
    }
    
    if (numericValue < minValue) {
      // Corriger automatiquement vers le minimum
      onChange(minValue);
      setInputValue(minValue.toString());
      setError(null);
      return;
    }
    
    if (numericValue > maxValue) {
      // Corriger automatiquement vers le maximum
      onChange(maxValue);
      setInputValue(maxValue.toString());
      setError(null);
      return;
    }
    
    // Si la valeur est valide
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
      {/* Affichage du tarif avec seul le nombre cliquable */}
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

      {/* Message d'erreur instantané (pendant la frappe) */}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Slider */}
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
      
      {/* Bornes min et max */}
      <div className={styles.priceRangeLabels}>
        <span>{minValue} €</span>
        <span>{maxValue} €</span>
      </div>
    </div>
  );
};

const DevenirTuteur: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isAlreadyTutor, setIsAlreadyTutor] = useState(false);
  const [hasAnnonces, setHasAnnonces] = useState(false);

  // Questions pour devenir tuteur
  const tutorQuestions: TutorQuestion[] = [
    {
      id: 'specialties',
      question: "Dans quelles matières souhaitez-vous donner des cours ?",
      type: 'specialties',
      field: 'specialties'
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
      field: 'teachingLevels'
    },
    {
      id: 'rate',
      question: "Quel tarif horaire proposez-vous ?",
      type: 'slider',
      field: 'hourlyRate',
      min: 7,
      max: 100,
      step: 5
    },
    {
      id: 'confirmation',
      question: isAlreadyTutor 
        ? "Souhaitez-vous créer votre première annonce ?"
        : "Souhaitez-vous devenir tuteur et créer votre première annonce ?",
      type: 'confirmation'
    }
  ];

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      
      if (!currentUser) {
        navigate('/connexion');
        return;
      }

      // Vérifier si l'utilisateur est déjà tuteur
      if (currentUser.role === 'tutor') {
        setIsAlreadyTutor(true);
        
        // Vérifier si le tuteur a déjà des annonces
        try {
          const annoncesResponse = await annonceService.getMyAnnonces();
          if (annoncesResponse.success && annoncesResponse.data.length > 0) {
            setHasAnnonces(true);
            // Rediriger si le tuteur a déjà des annonces
            navigate('/dashboard', {
              state: {
                message: 'Vous avez déjà des annonces publiées.'
              }
            });
            return;
          }
        } catch (error) {
          console.error('Erreur vérification annonces:', error);
        }
        
        setCheckingProfile(false);
        return;
      }

      // Pour les étudiants, vérifier si le profil est complété à 100%
      try {
        const statusResponse = await profileService.getProfileStatus();
        if (statusResponse.success) {
          const isComplete = statusResponse.data.completionPercentage === 100;
          setProfileComplete(isComplete);
          
          if (!isComplete) {
            navigate('/completer-profil', { 
              state: { 
                message: 'Veuillez compléter votre profil à 100% avant de devenir tuteur' 
              } 
            });
            return;
          }
        } else {
          navigate('/completer-profil', { 
            state: { 
              message: statusResponse.message || 'Erreur lors de la vérification du profil' 
            } 
          });
          return;
        }
      } catch (error) {
        console.error('Erreur vérification profil:', error);
        navigate('/completer-profil', { 
          state: { 
            message: 'Erreur lors de la vérification de votre profil' 
          } 
        });
        return;
      } finally {
        setCheckingProfile(false);
      }
    };

    loadUserAndProfile();
  }, [navigate]);

  const handleAnswer = (answer: any) => {
    const currentQuestion = tutorQuestions[currentStep];
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentStep < tutorQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (isAlreadyTutor) {
        // Tuteur existant : confirmation directe
        setShowConfirmation(true);
      } else {
        // Étudiant : afficher l'avertissement de migration
        setShowMigrationWarning(true);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleConfirmMigration = async () => {
    setIsLoading(true);
    try {
      const migrationData: MigrationData = {
        specialties: Array.isArray(answers.specialties) ? answers.specialties : [answers.specialties],
        teachingLevels: Array.isArray(answers.levels) ? answers.levels : [answers.levels],
        hourlyRate: answers.rate || 30,
        experience: '',
        bio: `Tuteur spécialisé en ${Array.isArray(answers.specialties) ? answers.specialties.join(', ') : answers.specialties}`
      };

      const response = await migrationService.migrateToTutor(migrationData);
      
      if (response.success) {
        navigate('/dashboard', { 
          state: { 
            message: 'Félicitations ! Vous êtes maintenant tuteur et votre première annonce a été créée.' 
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la migration vers tuteur:', error);
    } finally {
      setIsLoading(false);
      setShowMigrationWarning(false);
    }
  };

  const handleCreateFirstAnnonce = async () => {
    setIsLoading(true);
    try {
      const subjects = Array.isArray(answers.specialties) ? answers.specialties : [answers.specialties || 'Tutorat général'];
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
        navigate('/dashboard', { 
          state: { 
            message: 'Votre première annonce a été créée avec succès !' 
          }
        });
      }
    } catch (error: any) {
      console.error('Erreur création annonce:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / tutorQuestions.length) * 100;
  };

  const canProceed = () => {
    const currentQuestion = tutorQuestions[currentStep];
    const answer = answers[currentQuestion.id];
    
    switch (currentQuestion.type) {
      case 'choice':
      case 'slider':
        return answer !== undefined && answer !== null;
      case 'multi-select':
        return Array.isArray(answer) && answer.length > 0;
      case 'specialties':
        return Array.isArray(answer) && answer.length > 0;
      default:
        return true;
    }
  };

  const renderQuestion = (question: TutorQuestion) => {
    switch (question.type) {
      case 'choice':
        return (
          <div className={styles.optionsGrid}>
            {question.options?.map((option, index) => (
              <button
                key={index}
                className={`${styles.optionButton} ${
                  answers[question.id] === option ? styles.selected : ''
                }`}
                onClick={() => handleAnswer(option)}
              >
                <span className={styles.optionText}>{option}</span>
                {answers[question.id] === option && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
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
                      // Si "Tous niveaux" est sélectionné, désélectionner tout le reste
                      newAnswers = ["Tous niveaux"];
                    } else if (Array.isArray(currentAnswers) && currentAnswers.includes(option)) {
                      // Désélectionner l'option
                      newAnswers = currentAnswers.filter((item: string) => item !== option && item !== "Tous niveaux");
                    } else {
                      // Sélectionner l'option et retirer "Tous niveaux" si présent
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

      case 'specialties':
        return (
          <SpecialtiesInput
            onSelect={(value) => handleAnswer(value)}
            initialValue={answers[question.id]}
          />
        );

      case 'slider':
        return (
          <PriceSlider
            question={question}
            value={answers[question.id]}
            onChange={(value) => handleAnswer(value)}
          />
        );        

      case 'confirmation':
        return (
          <div className={styles.confirmationSection}>
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>
                {isAlreadyTutor 
                  ? 'Création de votre première annonce' 
                  : 'Devenir tuteur - Récapitulatif'
                }
              </h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Spécialités:</span>
                  <span className={styles.summaryValue}>
                    {Array.isArray(answers.specialties) 
                      ? answers.specialties.join(', ') 
                      : answers.specialties || 'Non spécifié'}
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
                onClick={isAlreadyTutor ? handleCreateFirstAnnonce : () => setShowMigrationWarning(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner}></div>
                    {isAlreadyTutor ? 'Création...' : 'Confirmation...'}
                  </>
                ) : (
                  isAlreadyTutor 
                    ? 'Créer ma première annonce'
                    : 'Devenir tuteur'
                )}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => navigate('/dashboard')}
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

  // Afficher le loader pendant la vérification
  if (checkingProfile || !user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Vérification de votre profil...</p>
        </div>
      </div>
    );
  }

  // Popup d'avertissement pour la migration étudiant -> tuteur
  if (showMigrationWarning) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2>⚠️ Attention : Action irréversible</h2>
          </div>
          <div className={styles.modalContent}>
            <p>
              Vous êtes sur le point de devenir tuteur. Cette action est <strong>irréversible</strong> et va :
            </p>
            <ul className={styles.warningList}>
              <li>✅ Créer votre profil tuteur</li>
              <li>✅ Créer votre première annonce de cours</li>
              <li>❌ Changer définitivement votre statut d'étudiant à tuteur</li>
            </ul>
            <p>
              Vous pourrez ensuite compléter votre profil tuteur et créer d'autres annonces.
            </p>
          </div>
          <div className={styles.modalActions}>
            <button
              className={styles.cancelButton}
              onClick={() => setShowMigrationWarning(false)}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              className={styles.confirmButton}
              onClick={handleConfirmMigration}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner}></div>
                  Migration en cours...
                </>
              ) : (
                'Confirmer et devenir tuteur'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = tutorQuestions[currentStep];

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
        {isAlreadyTutor ? (
          <div className={styles.statusInfo}>
            <span className={styles.statusBadge}>Tuteur</span>
            <p className={styles.statusText}>
              Initialisation de votre <strong>première annonce</strong>
            </p>
          </div>
        ) : (
          <div className={styles.statusInfo}>
            <span className={styles.statusBadge}>Étudiant</span>
            <p className={styles.statusText}>
              Devenir tuteur et créer votre <strong>première annonce</strong>
            </p>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {!showConfirmation ? (
          <>
            <div className={styles.questionSection}>
              <div className={styles.questionHeader}>
                <h1 className={styles.question}>
                  {currentQuestion.question}
                </h1>
                <div className={styles.stepIndicator}>
                  Étape {currentStep + 1} sur {tutorQuestions.length}
                </div>
              </div>

              {renderQuestion(currentQuestion)}

              {/* Boutons de navigation */}
              <div className={styles.navigationButtons}>
                {/* Bouton Retour */}
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

                {/* Bouton Suivant */}
                {currentQuestion.type !== 'confirmation' && (
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
              {tutorQuestions.map((_, index) => (
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
            {renderQuestion(tutorQuestions[tutorQuestions.length - 1])}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevenirTuteur;