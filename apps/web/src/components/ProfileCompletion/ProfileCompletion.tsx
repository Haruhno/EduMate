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
  const [isInitializing, setIsInitializing] = useState(true); // Nouvel état pour l'initialisation

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
      const profile = location.state.profileData;
      const formattedBirthDate = profile.birthDate 
        ? new Date(profile.birthDate).toISOString().split('T')[0]
        : '';
      
      setProfileData((prev) => ({
        ...prev,
        ...profile,
        // Convertir la date de naissance au format YYYY-MM-DD pour les champs de type date
        birthDate: formattedBirthDate,
        // Garder les champs nom, prénom et email intacts
        firstName: prev.firstName,
        lastName: prev.lastName,
        email: prev.email,
        // Sécurité : garder une image par défaut si manquante
        profilePicture: profile.profilePicture || '/assets/images/avatar.jpg',
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
      } finally {
        setIsInitializing(false); // Fin de l'initialisation
      }
    };

    if (authService.isAuthenticated()) {
      loadUserData();
    } else {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await profileService.getProfile();
        if (response.success && response.data.profile) {
          console.log('Données du profil chargées:', response.data.profile);
          
          // Formater correctement la date de naissance si elle existe
          const profile = response.data.profile;
          const formattedBirthDate = profile.birthDate 
            ? new Date(profile.birthDate).toISOString().split('T')[0]
            : '';
          
          setProfileData(prev => ({
            ...prev,
            ...profile,
            birthDate: formattedBirthDate, // Utiliser la date formatée
            // Assurez-vous que les diplômes sont bien inclus
            diplomas: profile.diplomas || []
          }));
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
      }
    };

    if (authService.isAuthenticated()) {
      loadProfileData();
    }
  }, []);

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

  // Validation 
  const validateCurrentStep = () => {
    const newErrors: { [key: string]: string } = {};

    // Ne pas valider pendant l'initialisation
    if (isInitializing) {
      return newErrors;
    }

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
      
      // Date de naissance obligatoire seulement pour les tuteurs
      if (role === 'tutor') {
        if (!profileData.birthDate)
          newErrors.birthDate = 'La date de naissance est obligatoire pour les tuteurs.';
        else {
          const birthDate = new Date(profileData.birthDate);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const isBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
          const actualAge = isBirthdayPassed ? age : age - 1;
          
          if (actualAge < 16) newErrors.birthDate = 'Vous devez avoir au moins 16 ans pour être tuteur.';
        }
      }

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
    
    // Validation pour l'étape EducationStep - Vérifier les erreurs d'années
    else if (steps[currentStep].title === 'Études' || steps[currentStep].title === 'Diplômes') {
      // Vérifier s'il y a des erreurs d'années dans les diplômes existants
      if (profileData.diplomas && profileData.diplomas.length > 0) {
        profileData.diplomas.forEach((diploma: any, index: number) => {
          if (diploma.startYear && diploma.endYear && !diploma.isCurrent) {
            if (diploma.endYear < diploma.startYear) {
              newErrors[`diploma-${index}-endYear`] = "L'année de fin ne peut pas être antérieure à l'année de début";
            }
          }
        });
      }
    }

    return newErrors;
  };

  // Effet pour nettoyer les erreurs après l'initialisation
  useEffect(() => {
    if (!isInitializing) {
      const newErrors = validateCurrentStep();
      setErrors(newErrors);
    }
  }, [isInitializing, profileData, currentStep]);

  // Dans la fonction eNext, ajouter la validation pour EducationStep
  const eNext = () => {
    const newErrors = validateCurrentStep();
    setErrors(newErrors);

    // Validation spéciale pour GeneralInfoStep
    if (steps[currentStep].title === 'Informations générales') {
      // @ts-ignore - Appeler la validation spécifique à GeneralInfoStep
      const isGeneralInfoStepValid = window.validateGeneralInfoStep?.();
      if (!isGeneralInfoStepValid) {
        const firstErrorField = Object.keys(newErrors).find(key => 
          ['firstName', 'lastName', 'email', 'birthDate', 'phone'].includes(key)
        );
        if (firstErrorField) {
          const errorElement = document.getElementById(firstErrorField);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }
    }

    // Validation spéciale pour ExperienceStep
    if (steps[currentStep].title === 'Expérience') {
      // @ts-ignore - Appeler la validation spécifique à ExperienceStep
      const isExperienceStepValid = window.validateExperienceStep?.();
      if (!isExperienceStepValid) {
        const firstErrorField = Object.keys(newErrors).find(key => key.startsWith('experience-'));
        if (firstErrorField) {
          const errorElement = document.querySelector(`.${styles.experienceCard}`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }
    }

    // Validation spéciale pour EducationStep
    if (steps[currentStep].title === 'Études' || steps[currentStep].title === 'Diplômes') {
      // @ts-ignore - Appeler la validation spécifique à EducationStep
      const isEducationStepValid = window.validateEducationStep?.();
      if (!isEducationStepValid) {
        const firstErrorField = Object.keys(newErrors).find(key => key.startsWith('diploma-'));
        if (firstErrorField) {
          const errorElement = document.querySelector(`.${styles.diplomaCard}`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }
    }

    if (Object.keys(newErrors).length === 0) {
      if (!isFinalStep) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        eSubmit();
      }
    } else {
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        let errorElement;
        
        if (firstErrorField.startsWith('diploma-')) {
          errorElement = document.querySelector(`.${styles.diplomaCard}`);
        } else if (firstErrorField.startsWith('experience-')) {
          errorElement = document.querySelector(`.${styles.experienceCard}`);
        } else {
          errorElement = document.getElementById(firstErrorField);
        }
        
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const eBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const eSubmit = async () => {
    setIsLoading(true);
    try {
      await profileService.saveProfile(profileData, currentStep);
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

  // Afficher un loader pendant l'initialisation si nécessaire
  if (isInitializing) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Chargement de vos informations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header avec progression */}
      <div className={styles.header}>
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`${styles.step} ${index <= currentStep ? styles.active : ''}`}
            >
              <div className={styles.stepNumber}>{index + 1}</div>
              <span className={styles.stepTitle}>{step.title}</span>
            </div>
          ))}
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
      <div className={`${styles.splitContainer} ${isFinalStep ? styles.fullWidth : ''}`}>
        {/* Section formulaire */}
        <div className={`${styles.formSection} ${isFinalStep ? styles.fullWidthForm : ''}`}>
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
            
            {/* Navigation pour les étapes normales */}
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

        {/* Section preview (masquée en finalisation) */}
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