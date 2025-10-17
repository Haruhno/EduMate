import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ProfileCompletion.module.css';
import profileService from '../../services/profileService';
import authService from '../../services/authService';
import type { ProfileData } from '../../services/profileService';

// Composants d'étapes
import GeneralInfoStep from '../Steps/GeneralInfoStep';
import EducationStep from '../Steps/EducationStep';
import ExperienceStep from '../Steps/ExperienceStep';
import AvailabilityStep from '../Steps/AvailabilityStep';
import LocationStep from '../Steps/LocationStep';
import PreviewStep from '../Steps/PreviewStep';

const ProfileCompletion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || 'student';
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const [profileData, setProfileData] = useState<ProfileData>({
    profilePicture: '/assets/images/avatar.jpg',
    firstName: location.state?.firstName || '',
    lastName: location.state?.lastName || '',
    email: location.state?.email || '',
    phone: '',
    countryCode: '+33',
    gender: '',
    birthDate: '',
    address: '',
    educationLevel: '',
    school: '',
    field: '',
    year: '',
    experience: '',
    bio: '',
    specialties: [],
    availability: {
      online: false,
      inPerson: false,
    },
    schedule: [],
    location: {
      address: '',
      radius: 8,
      city: '',
      coordinates: { lat: 0, lng: 0 },
    },
  });

  // Si on arrive en mode "modification" avec des données existantes, préremplir
  useEffect(() => {
    if (location.state?.continueProfile && location.state?.profileData) {
      setProfileData((prev) => ({
        ...prev,
        ...location.state.profileData,
        // Garder les champs nom, prénom et email intacts
        firstName: prev.firstName,
        lastName: prev.lastName,
        email: prev.email,
        // Convertir la date de naissance au format YYYY-MM-DD pour les champs de type date
        birthDate: location.state.profileData.birthDate
          ? new Date(location.state.profileData.birthDate).toISOString().split('T')[0]
          : '',
        // Sécurité : garder une image par défaut si manquante
        profilePicture: location.state.profileData.profilePicture || '/assets/images/avatar.jpg',
      }));
    }
  }, [location.state]);

  // Charger uniquement les données de l'utilisateur (nom, prénom, email)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          setProfileData((prev) => ({
            ...prev,
            firstName: user.firstName || prev.firstName,
            lastName: user.lastName || prev.lastName,
            email: user.email || prev.email,
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      }
    };

    if (authService.isAuthenticated()) {
      loadUserData();
    }
  }, []); // ← vide pour ne le lancer qu'une fois

  // Sauvegarder automatiquement à chaque étape
  useEffect(() => {
    const saveProgress = async () => {
      if (currentStep >= 0 && authService.isAuthenticated()) {
        try {
          await profileService.saveProfile(profileData, currentStep);
        } catch (error) {
          console.error('Erreur de sauvegarde automatique:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [profileData, currentStep]);

  // Étapes selon le rôle
  const steps = role === 'student'
    ? [
        { title: 'Informations générales', component: GeneralInfoStep },
        { title: 'Études', component: EducationStep },
        { title: 'Localisation', component: LocationStep },
        { title: 'Finalisation', component: PreviewStep },
      ]
    : [
        { title: 'Informations générales', component: GeneralInfoStep },
        { title: 'Diplômes', component: EducationStep },
        { title: 'Expérience', component: ExperienceStep },
        { title: 'Disponibilité', component: AvailabilityStep },
        { title: 'Localisation', component: LocationStep },
        { title: 'Finalisation', component: PreviewStep },
      ];

  const CurrentStepComponent = steps[currentStep].component;
  const isFinalStep = currentStep === steps.length - 1;

  // Validation - SEULEMENT les informations générales sont obligatoires
  const validateCurrentStep = () => {
    const newErrors: { [key: string]: string } = {};

    // Seulement la première étape (Informations générales) est obligatoire
    if (steps[currentStep].title === 'Informations générales') {
      if (!profileData.firstName?.trim())
        newErrors.firstName = 'Le prénom est obligatoire.';
      if (!profileData.lastName?.trim())
        newErrors.lastName = 'Le nom est obligatoire.';
      if (!profileData.email?.trim())
        newErrors.email = "L'adresse e-mail est obligatoire.";
      else if (!/\S+@\S+\.\S+/.test(profileData.email))
        newErrors.email = "L'adresse e-mail n'est pas valide.";
      
      // Date de naissance obligatoire
      if (!profileData.birthDate)
        newErrors.birthDate = 'La date de naissance est obligatoire.';
      else {
        const birthDate = new Date(profileData.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 16) newErrors.birthDate = 'Vous devez avoir au moins 16 ans.';
      }

      // Genre obligatoire
      if (!profileData.gender)
        newErrors.gender = 'Le genre est obligatoire.';

      // Validation du téléphone (optionnel mais doit être valide si rempli)
      setTouched({ ...touched, phone: true });
      const phoneValue = profileData.phone?.trim() || '';
      if (phoneValue !== '') {
        const digitsOnly = phoneValue.replace(/\D/g, '');
        if (
          (phoneValue.match(/\+/g)?.length || 0) > 1 ||
          digitsOnly.length < 8 ||
          digitsOnly.length > 15
        ) {
          newErrors.phone = 'Numéro de téléphone invalide';
        }
      }
    }

    // Les autres étapes (Études, Localisation, etc.) ne sont PAS obligatoires
    // L'utilisateur peut passer directement à l'étape suivante

    return newErrors;
  };

  const eNext = () => {
    const newErrors = validateCurrentStep();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (!isFinalStep) {
        setCurrentStep((prev) => prev + 1);
        // Scroll vers le haut quand on change d'étape
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        eSubmit();
      }
    } else {
      // Scroll vers la première erreur
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const eBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      // Scroll vers le haut quand on revient en arrière
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const eSubmit = async () => {
    setIsLoading(true);
    try {
      // Sauvegarder une dernière fois
      await profileService.saveProfile(profileData, currentStep);

      // Finaliser le profil
      const response = await profileService.completeProfile();

      if (response.success) {
        console.log('Profil complété avec succès:', response.data);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Erreur lors de la soumission du profil:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.response?.data?.message || 'Erreur lors de la soumission du profil',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Calcul du pourcentage de complétion en temps réel - SIMPLIFIÉ
  useEffect(() => {
    const calculateCompletion = () => {
      let completedFields = 0;
      const totalFields = 5; // Seulement les champs obligatoires des informations générales

      // Vérifier seulement les champs obligatoires des informations générales
      if (profileData.firstName?.trim()) completedFields++;
      if (profileData.lastName?.trim()) completedFields++;
      if (profileData.email?.trim()) completedFields++;
      if (profileData.birthDate) completedFields++;
      if (profileData.gender) completedFields++;

      const percentage = Math.round((completedFields / totalFields) * 100);
      setCompletionPercentage(percentage);
    };

    calculateCompletion();
  }, [profileData]);

  return (
    <div className={styles.container}>
      {/* Header avec progression et pourcentage */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {/* Pourcentage de complétion à gauche */}
          <div className={styles.completionBadge}>
            <span className={styles.completionText}>
              {completionPercentage}% complété
            </span>
          </div>
          
          <div className={styles.steps}>
            {steps.map((step, index) => (
              <div
                key={index}
                className={`${styles.step} ${
                  index <= currentStep ? styles.active : ''
                } ${index === currentStep ? styles.current : ''}`}
              >
                <div className={styles.stepNumber}>{index + 1}</div>
                <span className={styles.stepTitle}>{step.title}</span>
              </div>
            ))}
          </div>
          
          {/* Statut "Modification en cours" toujours affiché */}
          <div className={styles.profileStatus}>
            ✓ Modification en cours
          </div>
        </div>
      </div>

      {/* Message d'erreur global */}
      {errors.submit && (
        <div className={styles.errorBanner}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>{errors.submit}</span>
          </div>
        </div>
      )}

      {/* Split screen principal */}
      <div
        className={`${styles.splitContainer} ${
          isFinalStep ? styles.fullWidth : ''
        }`}
      >
        {/* Section formulaire */}
        <div
          className={`${styles.formSection} ${
            isFinalStep ? styles.fullWidthForm : ''
          }`}
        >
          <div className={`${styles.formContent} ${isFinalStep ? styles.centeredFinalStep : ''}`}>
            <CurrentStepComponent
              profileData={profileData}
              setProfileData={setProfileData}
              role={role}
              errors={errors}
              setErrors={setErrors}
              touched={touched}
              setTouched={setTouched}
            />
            
            {!isFinalStep && (
              <div className={styles.navigation}>
                <button
                  onClick={eBack}
                  disabled={currentStep === 0}
                  className={styles.backButton}
                >
                  Retour
                </button>

                <button onClick={eNext} className={styles.nextButton}>
                  {currentStep === steps.length - 2 ? 'Voir l\'aperçu' : 'Continuer'}
                </button>
              </div>
            )}
            
            {/* Navigation spéciale pour la finalisation */}
            {isFinalStep && (
              <div className={styles.finalNavigation}>
                <button onClick={eBack} className={styles.backButton}>
                  Retour
                </button>
                <button 
                  onClick={eSubmit} 
                  className={styles.nextButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'Traitement...' : 'Terminer mon profil'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section preview */}
        {!isFinalStep && (
          <div className={styles.previewSection}>
            <div className={styles.previewContent}>
              <PreviewStep profileData={profileData} role={role} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletion;