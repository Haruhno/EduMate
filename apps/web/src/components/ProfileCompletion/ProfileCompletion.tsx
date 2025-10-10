import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ProfileCompletion.module.css';

// Composants d'étapes
import GeneralInfoStep from '../Steps/GeneralInfoStep';
import EducationStep from '../Steps/EducationStep';
import ExperienceStep from '../Steps/ExperienceStep';
import AvailabilityStep from '../Steps/AvailabilityStep';
import LocationStep from '../Steps/LocationStep';
import PreviewStep from '../Steps/PreviewStep';

interface ProfileData {
  // Informations générales
  profilePicture: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  gender: string;
  birthDate: string;
  address: string;

  // Éducation
  educationLevel: string;
  school: string;
  field: string;
  year: string;
  diplomaFile?: File;

  // Expérience (tuteur)
  experience: string;
  bio: string;
  specialties: string[];

  // Disponibilité
  availability: {
    online: boolean;
    inPerson: boolean;
  };
  schedule: any[];

  // Localisation
  location: {
    address: string;
    radius: number;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

const ProfileCompletion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || 'student';
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  // Validation simple avant passage à l’étape suivante
  const eNext = () => {
    const newErrors: { [key: string]: string } = {};

    if (steps[currentStep].title === 'Informations générales') {
      if (!profileData.firstName.trim())
        newErrors.firstName = 'Le prénom est obligatoire.';
      if (!profileData.lastName.trim())
        newErrors.lastName = 'Le nom est obligatoire.';
      if (!profileData.email.trim())
        newErrors.email = "L’adresse e-mail est obligatoire.";

      // Validation du téléphone uniquement si le champ est rempli
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

    setErrors(newErrors);

    //Laisse passer si pas d’erreurs
    if (Object.keys(newErrors).length === 0) {
      if (!isFinalStep) setCurrentStep((prev) => prev + 1);
      else eSubmit();
    }
  };

  const eBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const eSubmit = async () => {
    try {
      console.log('Profil complet :', profileData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la soumission du profil :', error);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header avec progression */}
      <div className={styles.header}>
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
      </div>

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
                  Continuer
                </button>
              </div>
            )}
            
            {/* Navigation spéciale pour la finalisation */}
            {isFinalStep && (
              <div className={styles.finalNavigation}>
                <button onClick={eBack} className={styles.backButton}>
                  Retour
                </button>
                <button onClick={eNext} className={styles.nextButton}>
                  Terminer mon profil
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