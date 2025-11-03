import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DevenirTuteur.module.css';
import authService from '../../services/authService';
import profileService from '../../services/profileService';
import migrationService from '../../services/migrationService';
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

  // Liste des matières disponibles
  const availableSpecialties = [
    "Mathématiques", "Physique", "Chimie", "Français", "Anglais",
    "Histoire-Géographie", "SVT", "Philosophie", "Économie", "Informatique",
    "Espagnol", "Allemand", "Programmation", "Statistiques", "Biologie",
    "Sciences de l'ingénieur", "Arts", "Musique", "Sport", "Marketing",
    "Droit", "Médecine", "Psychologie", "Sociologie", "Communication"
  ];

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
    setSuggestions([]);
  };

  const handleRemoveSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter(s => s !== specialty);
    updateSelectedSpecialties(newSpecialties);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      const filtered = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().includes(value.toLowerCase()) &&
        !selectedSpecialties.includes(specialty)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
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

  return (
    <div className={styles.specialtiesContainer}>
      {/* Input avec autocomplétion */}
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Rechercher une matière..."
          className={styles.specialtiesInput}
        />
        
        {/* Suggestions d'autocomplétion */}
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((specialty, index) => (
              <div
                key={index}
                className={styles.suggestion}
                onClick={() => handleAddSpecialty(specialty)}
              >
                {specialty}
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
        {availableSpecialties.map((specialty, index) => (
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

      <p className={styles.helpText}>
        Cliquez sur les matières pour les sélectionner. Vous pouvez aussi en ajouter de nouvelles en les tapant.
      </p>
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
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isAlreadyTutor, setIsAlreadyTutor] = useState(false);

  // Questions pour devenir tuteur (sans la question sur l'expérience)
  const tutorQuestions: TutorQuestion[] = [
    {
      id: 'specialties',
      question: "Dans quelles matières souhaitez-vous donner des cours ?",
      type: 'specialties',
      field: 'specialties'
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
      id: 'availability',
      question: "Comment souhaitez-vous donner des cours ?",
      type: 'choice',
      options: [
        "En ligne",
        "En présentiel",
        "Les deux"
      ],
      field: 'availability'
    },
    {
      id: 'confirmation',
      question: "Souhaitez-vous confirmer votre profil de tuteur ?",
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
        setCheckingProfile(false);
        return;
      }

      // Vérifier si le profil est complété à 100%
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
      setShowConfirmation(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate(-1);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const migrationData: MigrationData = {
        specialties: Array.isArray(answers.specialties) ? answers.specialties : [answers.specialties],
        hourlyRate: answers.rate || 30,
        experience: '', // Plus utilisé mais gardé pour la compatibilité
        availability: {
          online: answers.availability === 'En ligne' || answers.availability === 'Les deux',
          inPerson: answers.availability === 'En présentiel' || answers.availability === 'Les deux'
        }
      };

      const response = await migrationService.migrateToTutor(migrationData);
      
      if (response.success) {
        navigate('/dashboard', { 
          state: { message: 'Félicitations ! Vous êtes maintenant tuteur.' }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la migration vers tuteur:', error);
      // Vous pouvez ajouter une notification d'erreur ici
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTutorProfile = async () => {
    setIsLoading(true);
    try {
      // Récupérer d'abord le profil existant
      const currentProfile = await profileService.getProfile();
      
      // Préparer les données de mise à jour
      const updateData = {
        ...currentProfile.data.profile, // Garder les données existantes
        specialties: Array.isArray(answers.specialties) ? answers.specialties : [answers.specialties],
        hourlyRate: answers.rate || 30,
        availability: {
          online: answers.availability === 'En ligne' || answers.availability === 'Les deux',
          inPerson: answers.availability === 'En présentiel' || answers.availability === 'Les deux'
        }
      };

      const response = await profileService.saveProfile(updateData, 0);

      if (response.success) {
        navigate('/dashboard', { 
          state: { message: 'Votre profil tuteur a été mis à jour avec succès.' }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil tuteur:', error);
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

      case 'specialties':
        return (
          <SpecialtiesInput
            onSelect={(value) => handleAnswer(value)}
            initialValue={answers[question.id]}
          />
        );

      case 'slider':
        return (
          <div className={styles.sliderContainer}>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderValue}>€{answers[question.id] || question.min}</span>
              <span className={styles.sliderLabel}>/heure</span>
            </div>
            <input
              type="range"
              min={question.min}
              max={question.max}
              step={question.step}
              value={answers[question.id] || question.min}
              onChange={(e) => handleAnswer(parseInt(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>€{question.min}</span>
              <span>€{question.max}</span>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className={styles.confirmationSection}>
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>
                {isAlreadyTutor 
                  ? 'Mise à jour de votre profil tuteur' 
                  : 'Récapitulatif de votre profil tuteur'
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
                  <span className={styles.summaryLabel}>Tarif horaire:</span>
                  <span className={styles.summaryValue}>€{answers.rate || '30'}/heure</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Mode d'enseignement:</span>
                  <span className={styles.summaryValue}>
                    {answers.availability || 'Non spécifié'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className={styles.confirmationOptions}>
              <button
                className={styles.confirmButton}
                onClick={isAlreadyTutor ? handleUpdateTutorProfile : handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner}></div>
                    {isAlreadyTutor ? 'Mise à jour...' : 'Confirmation...'}
                  </>
                ) : (
                  isAlreadyTutor 
                    ? 'Mettre à jour mon profil tuteur'
                    : 'Oui, confirmer mon profil tuteur'
                )}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => navigate('/dashboard')}
              >
                {isAlreadyTutor ? 'Annuler' : 'Non, pas pour le moment'}
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

  // Si l'utilisateur est déjà tuteur, on adapte le titre
  const currentQuestion = tutorQuestions[currentStep];

  return (
    <div className={styles.container}>
      {/* Header avec progression */}
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <svg className={styles.backIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <div className={styles.progressText}>
            Étape {currentStep + 1} sur {tutorQuestions.length}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {!showConfirmation ? (
          <>
            <div className={styles.questionSection}>
              <div className={styles.questionHeader}>
                <h1 className={styles.question}>
                  {isAlreadyTutor && currentStep === 0 
                    ? "Complétez votre profil tuteur" 
                    : currentQuestion.question
                  }
                </h1>
                <div className={styles.stepIndicator}>
                  {currentStep + 1}/{tutorQuestions.length}
                </div>
              </div>

              {renderQuestion(currentQuestion)}

              {/* Bouton Suivant */}
              {currentQuestion.type !== 'confirmation' && (
                <div className={styles.nextButtonContainer}>
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
                </div>
              )}
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