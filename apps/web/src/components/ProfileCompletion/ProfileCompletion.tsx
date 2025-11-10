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
  const [isInitializing, setIsInitializing] = useState(true);

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

  // SUPPRIMER le deuxième useEffect qui duplique le chargement
  // Charger les données utilisateur et le profil complet
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = authService.getCurrentUser();
        let userData = {
          firstName: location.state?.firstName || '',
          lastName: location.state?.lastName || '',
          email: location.state?.email || '',
        };

        if (user) {
          userData = {
            firstName: user.firstName || userData.firstName,
            lastName: user.lastName || userData.lastName,
            email: user.email || userData.email,
          };
        }

        // Charger le profil complet
        try {
          const response = await profileService.getProfile();
          if (response.success && response.data.profile) {
            const profile = response.data.profile;
            
            // Formater la date de naissance si elle existe
            const formattedBirthDate = profile.birthDate 
              ? new Date(profile.birthDate).toISOString().split('T')[0]
              : '';

            setProfileData(prev => ({
              ...prev,
              ...profile,
              // Appliquer le format correct pour la date de naissance
              birthDate: formattedBirthDate,
              // Garder les données utilisateur prioritaires
              firstName: userData.firstName || profile.firstName || prev.firstName,
              lastName: userData.lastName || profile.lastName || prev.lastName,
              email: userData.email || profile.email || prev.email,
            }));
          } else {
            // Si pas de profil, utiliser les données utilisateur de base
            setProfileData(prev => ({
              ...prev,
              ...userData
            }));
          }
        } catch (profileError) {
          console.error('Erreur chargement profil complet:', profileError);
          // En cas d'erreur, utiliser les données utilisateur de base
          setProfileData(prev => ({
            ...prev,
            ...userData
          }));
        }

      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (authService.isAuthenticated()) {
      loadUserData();
    } else {
      setIsInitializing(false);
    }
  }, []); // Supprimer isInitializing des dépendances

  // Gérer le mode modification avec données existantes
  useEffect(() => {
    if (location.state?.continueProfile && location.state?.profileData) {
      const profile = location.state.profileData;
      const formattedBirthDate = profile.birthDate 
        ? new Date(profile.birthDate).toISOString().split('T')[0]
        : '';
      
      setProfileData((prev) => ({
        ...prev,
        ...profile,
        // Convertir la date de naissance au format YYYY-MM-DD
        birthDate: formattedBirthDate,
        // NE PAS écraser le prénom, nom et email
        firstName: prev.firstName,
        lastName: prev.lastName,
        email: prev.email,
        profilePicture: profile.profilePicture || '/assets/images/avatar.jpg',
      }));
    }
  }, [location.state]);

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

    if (isInitializing) {
      return newErrors;
    }

    if (steps[currentStep].title === 'Informations générales') {
      if (!profileData.firstName?.trim())
        newErrors.firstName = 'Le prénom est obligatoire.';
      if (!profileData.lastName?.trim())
        newErrors.lastName = 'Le nom est obligatoire.';
      if (!profileData.email?.trim())
        newErrors.email = "L'adresse e-mail est obligatoire.";
      else if (!/\S+@\S+\.\S+/.test(profileData.email))
        newErrors.email = "L'adresse e-mail n'est pas valide.";
      
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
    
    else if (steps[currentStep].title === 'Études' || steps[currentStep].title === 'Diplômes') {
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

  useEffect(() => {
    if (!isInitializing) {
      const newErrors = validateCurrentStep();
      setErrors(newErrors);
    }
  }, [isInitializing, profileData, currentStep]);

  const eNext = () => {
    const newErrors = validateCurrentStep();
    setErrors(newErrors);

    if (steps[currentStep].title === 'Informations générales') {
      const isGeneralInfoStepValid = (window as any).validateGeneralInfoStep?.();
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

    if (steps[currentStep].title === 'Expérience') {
      const isExperienceStepValid = (window as any).validateExperienceStep?.();
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

    if (steps[currentStep].title === 'Études' || steps[currentStep].title === 'Diplômes') {
      const isEducationStepValid = (window as any).validateEducationStep?.();
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
      console.error('Détails de l\'erreur:', error.response?.data);
      setErrors(prev => ({
        ...prev,
        submit: error.response?.data?.message || 'Erreur lors de la soumission du profil',
      }));
    } finally {
      setIsLoading(false);
    }
  };

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