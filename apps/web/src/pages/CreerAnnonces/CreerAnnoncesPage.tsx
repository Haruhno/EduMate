import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreerAnnoncesPage.module.css';
import authService from '../../services/authService';
import annonceService from '../../services/annonceService';
import profileService from '../../services/profileService';
import { allSkills } from '../../data/skillsData';

interface AnnonceQuestion {
  id: string;
  question: string;
  type: 'skills' | 'multi-select' | 'slider' | 'confirmation';
  options?: string[];
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface PriceSliderProps {
  question: AnnonceQuestion;
  value: number;
  onChange: (value: number) => void;
}

// Composant pour la barre de recherche de compétences
const SkillsInput: React.FC<{
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  role: string;
}> = ({ skills, onSkillsChange, role }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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

  // Gestion des touches clavier
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
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
      onSkillsChange(newSkills);
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleRemoveSkill = (skill: string) => {
    const newSkills = skills.filter(s => s !== skill);
    onSkillsChange(newSkills);
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
    <div className={styles.skillsContainer}>
      <p className={styles.helpText}>
        Quelles compétences possédez-vous ? Tapez et appuyez sur Entrée pour ajouter. Utilisez ↑ et ↓ pour naviguer.
      </p>
      {/* Input avec autocomplétion */}
      <div className={styles.inputWrapper} ref={inputRef}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(true)}
          placeholder="Tapez une compétence et appuyez sur Entrée..."
          className={styles.skillsInput}
        />

        {/* Suggestions d'autocomplétion avec navigation clavier */}
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
      {/* Liste des compétences sélectionnées (tags) */}
      <div className={styles.selectedSkills}>
        {skills.sort((a, b) => a.localeCompare(b)).map((skill, index) => (
          <span key={index} className={styles.skillTag}>
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
      </div>
    </div>
  );
};

const PriceSlider: React.FC<PriceSliderProps> = ({ question, value, onChange }) => {
  const minValue = question.min ?? 15;
  const maxValue = question.max ?? 100;
  const stepValue = 1;
  
  const initialValueRef = useRef(value || minValue);
  const currentValue = value !== undefined ? value : initialValueRef.current;
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue.toString());
  const [error, setError] = useState<string | null>(null);

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

const CreerAnnoncesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({
    rate: 15,
    skills: []
  });
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const annonceQuestions: AnnonceQuestion[] = [
    {
      id: 'skills',
      question: "Quelle(s) compétence(s) possédez-vous ?",
      type: 'skills',
      field: 'skills'
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

    const loadUserProfile = async () => {
      setLoadingSkills(true);
      try {
        const response = await profileService.getProfile();
        
        if (response.success && response.data.profile) {
          setProfile(response.data.profile);
          
          const profileSkills = response.data.profile.skills || [];
          
          if (profileSkills.length > 0) {
            setUserSkills(profileSkills);
            setAnswers(prev => ({ ...prev, skills: profileSkills }));
          } else if (response.data.profile.specialties && response.data.profile.specialties.length > 0) {
            const specialtiesAsSkills = response.data.profile.specialties;
            setUserSkills(specialtiesAsSkills);
            setAnswers(prev => ({ ...prev, skills: specialtiesAsSkills }));
          } else {
            const defaultSkills = ['Mathématiques', 'Français', 'Anglais'];
            setUserSkills(defaultSkills);
            setAnswers(prev => ({ ...prev, skills: defaultSkills }));
          }
        } else {
          const defaultSkills = ['Mathématiques', 'Français'];
          setUserSkills(defaultSkills);
          setAnswers(prev => ({ ...prev, skills: defaultSkills }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        const localSkills = localStorage.getItem(`user_${currentUser.id}_skills`);
        if (localSkills) {
          const skills = JSON.parse(localSkills);
          setUserSkills(skills);
          setAnswers(prev => ({ ...prev, skills }));
        } else {
          const defaultSkills = ['Mathématiques', 'Français'];
          setUserSkills(defaultSkills);
          setAnswers(prev => ({ ...prev, skills: defaultSkills }));
        }
      } finally {
        setLoadingSkills(false);
      }
    };

    loadUserProfile();
  }, [navigate]);

  const handleAnswer = (answer: any) => {
    const currentQuestion = annonceQuestions[currentStep];
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    
    if (currentQuestion.id === 'skills' && user) {
      localStorage.setItem(`user_${user.id}_skills`, JSON.stringify(answer));
    }
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
      const skills = Array.isArray(answers.skills) ? answers.skills : [answers.skills || 'Général'];
      const primarySkill = skills[0];
      
      const annonceData = {
        title: `Cours de ${primarySkill}`,
        description: `Cours personnalisé de ${skills.join(', ')} pour niveau ${Array.isArray(answers.levels) ? answers.levels.join(', ') : answers.levels}`,
        subject: primarySkill, 
        subjects: skills,
        level: Array.isArray(answers.levels) ? answers.levels.join(', ') : answers.levels || 'Tous niveaux',
        hourlyRate: answers.rate ?? 15,
        teachingMode: 'Les deux',
        location: {
          address: profile?.location?.address || user?.address || '',
          city: profile?.location?.city || '',
          coordinates: { 
            lat: profile?.location?.coordinates?.lat || 0, 
            lng: profile?.location?.coordinates?.lng || 0 
          }
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
      } else {
        throw new Error(response.message || 'Erreur lors de la création de l\'annonce');
      }
    } catch (error) {
      console.error('Erreur création annonce:', error);
      alert('Erreur lors de la création de l\'annonce. Veuillez réessayer.');
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
      case 'skills':
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
      case 'skills':
        if (loadingSkills) {
          return (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Chargement de vos compétences...</p>
            </div>
          );
        }
        
        return (
          <SkillsInput
            skills={answers[question.id] || userSkills}
            onSkillsChange={(value: string[]) => handleAnswer(value)}
            role="tutor"
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
            value={answers[question.id] ?? 15}
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
                  <span className={styles.summaryLabel}>Compétences:</span>
                  <span className={styles.summaryValue}>
                    {Array.isArray(answers.skills) 
                      ? answers.skills.join(', ') 
                      : answers.skills || 'Non spécifié'}
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
                  <span className={styles.summaryValue}>€{answers.rate ?? '15'}/heure</span>
                </div>
                {profile?.location?.address && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Localisation:</span>
                    <span className={styles.summaryValue}>{profile.location.address}</span>
                  </div>
                )}
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

export default CreerAnnoncesPage;