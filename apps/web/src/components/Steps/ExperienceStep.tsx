import React, { useRef, useState, useEffect } from 'react';
import styles from './ExperienceStep.module.css';

interface ExperienceStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  touched: { [key: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

interface Experience {
  id?: string;
  jobTitle: string;
  employmentType: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: number | '';
  endMonth: string;
  endYear: number | '';
  isCurrent: boolean;
  description: string;
}

interface DropdownState {
  [key: number]: {
    employmentType: boolean;
    startMonth: boolean;
    startYear: boolean;
    endMonth: boolean;
    endYear: boolean;
  };
}

type DropdownField = 'employmentType' | 'startMonth' | 'startYear' | 'endMonth' | 'endYear';

const ExperienceStep: React.FC<ExperienceStepProps> = ({
  profileData,
  setProfileData,
  errors,
  setErrors
}) => {
  const dropdownRefs = useRef<{ [key: number]: { [key in DropdownField]?: HTMLDivElement | null } }>({});
  
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({});
  const [hasBeenValidated, setHasBeenValidated] = useState(false);

  const employmentTypes = [
    'CDI',
    'CDD', 
    'Stage',
    'Alternance',
    'Freelance',
    'Intérim',
    'Autre'
  ];

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  // Préremplissage des données
  useEffect(() => {
    if (profileData?.experiences && profileData.experiences.length > 0) {
      console.log('Initialisation avec les expériences existantes:', profileData.experiences);
      setExperiences(profileData.experiences);
    } else {
      // Si pas d'expériences, créer une expérience vide
      setExperiences([{
        jobTitle: '',
        employmentType: '',
        company: '',
        location: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        isCurrent: false,
        description: ''
      }]);
    }
    setIsInitialized(true);
  }, [profileData.experiences]);

  // Mettre à jour profileData quand les expériences changent
  useEffect(() => {
    if (isInitialized) {
      console.log('Mise à jour de profileData avec expériences:', experiences);
      setProfileData((prevData: any) => ({
        ...prevData,
        experiences: experiences
      }));

      // Si on a déjà validé une fois, revalider à chaque changement
      if (hasBeenValidated) {
        validateAllExperiences();
      }
    }
  }, [experiences, isInitialized, setProfileData]);

  // VALIDATION DE TOUTES LES EXPÉRIENCES
  const validateAllExperiences = () => {
    const newErrors: { [key: string]: string } = { ...errors };
    
    // Supprimer les anciennes erreurs d'expériences
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith('experience-')) {
        delete newErrors[key];
      }
    });

    let hasAnyError = false;

    experiences.forEach((experience, index) => {
      const experienceKey = `experience-${index}`;
      const hasStartedFilling = hasExperienceStartedFilling(experience);

      if (hasStartedFilling) {
        // Vérifier que tous les champs obligatoires sont remplis (sauf description)
        if (!experience.jobTitle?.trim()) {
          newErrors[`${experienceKey}-jobTitle`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!experience.employmentType?.trim()) {
          newErrors[`${experienceKey}-employmentType`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!experience.company?.trim()) {
          newErrors[`${experienceKey}-company`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!experience.location?.trim()) {
          newErrors[`${experienceKey}-location`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!experience.startMonth?.trim()) {
          newErrors[`${experienceKey}-startMonth`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!experience.startYear) {
          newErrors[`${experienceKey}-startYear`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        // Validation pour la date de fin si ce n'est pas le poste actuel
        if (!experience.isCurrent) {
          if (!experience.endMonth?.trim()) {
            newErrors[`${experienceKey}-endMonth`] = "Veuillez renseigner cette information";
            hasAnyError = true;
          }

          if (!experience.endYear) {
            newErrors[`${experienceKey}-endYear`] = "Veuillez renseigner cette information";
            hasAnyError = true;
          }

          // Validation de la cohérence des dates
          if (experience.startYear && experience.endYear) {
            if (experience.endYear < experience.startYear) {
              newErrors[`${experienceKey}-endYear`] = "L'année de fin ne peut pas être antérieure à l'année de début";
              hasAnyError = true;
            } else if (experience.endYear === experience.startYear) {
              const startMonthIndex = months.indexOf(experience.startMonth);
              const endMonthIndex = months.indexOf(experience.endMonth);
              if (endMonthIndex < startMonthIndex) {
                newErrors[`${experienceKey}-endMonth`] = "Le mois de fin ne peut pas être antérieur au mois de début";
                hasAnyError = true;
              }
            }
          }
        }
      }
    });

    setErrors(newErrors);
    return !hasAnyError;
  };

  // Vérifier si une expérience a commencé à être remplie
  const hasExperienceStartedFilling = (experience: Experience): boolean => {
    return (
      experience.jobTitle.trim() !== '' ||
      experience.employmentType.trim() !== '' ||
      experience.company.trim() !== '' ||
      experience.location.trim() !== '' ||
      experience.startMonth.trim() !== '' ||
      experience.startYear !== '' ||
      experience.endMonth.trim() !== '' ||
      experience.endYear !== '' ||
      experience.description.trim() !== ''
    );
  };


  // Fermer les dropdowns quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([indexStr, refs]) => {
        const index = parseInt(indexStr);
        Object.entries(refs).forEach(([field, ref]) => {
          if (ref && !ref.contains(event.target as Node)) {
            setDropdownOpen(prev => ({
              ...prev,
              [index]: {
                ...prev[index],
                [field as DropdownField]: false
              }
            }));
          }
        });
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
    
  // Gestion des dropdowns custom
  const toggleDropdown = (index: number, field: DropdownField) => {
    setDropdownOpen(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: !prev[index]?.[field]
      }
    }));
  };

  const handleSelectOption = (index: number, field: DropdownField, value: string) => {
    updateExperience(index, field, value);
    setDropdownOpen(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: false
      }
    }));
  };

  // Gestion des expériences
  const addExperience = () => {
    const newExperience: Experience = {
      jobTitle: '',
      employmentType: '',
      company: '',
      location: '',
      startMonth: '',
      startYear: '',
      endMonth: '',
      endYear: '',
      isCurrent: false,
      description: ''
    };
    
    setExperiences(prev => [...prev, newExperience]);
  };

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(prev => prev.filter((_, i) => i !== index));
      
      // Nettoyer les erreurs
      const experienceKey = `experience-${index}`;
      setErrors(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith(experienceKey)) {
            delete updated[key];
          }
        });
        return updated;
      });
    }
  };

  const updateExperience = (index: number, field: string, value: any) => {
    setExperiences(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Si on change isCurrent, gérer les dates de fin
      if (field === 'isCurrent' && value === true) {
        updated[index].endMonth = '';
        updated[index].endYear = '';
      }
      
      return updated;
    });
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    updateExperience(index, field, value);
  };

  const setDropdownRef = (index: number, field: DropdownField) => (el: HTMLDivElement | null) => {
    if (!dropdownRefs.current[index]) {
      dropdownRefs.current[index] = {};
    }
    dropdownRefs.current[index][field] = el;
  };

  const getDisplayText = (index: number, field: DropdownField, value: string | number) => {
    if (!value) {
      switch (field) {
        case 'employmentType': return 'Sélectionnez';
        case 'startMonth': return 'Mois';
        case 'startYear': return 'Année';
        case 'endMonth': return 'Mois';
        case 'endYear': return 'Année';
        default: return 'Sélectionnez';
      }
    }
    return value.toString();
  };

  // Filtrer les années de fin en fonction de l'année de début
  const getFilteredEndYears = (index: number) => {
    const startYear = experiences[index].startYear;
    if (!startYear) return years;
    return years.filter(year => year >= startYear);
  };

  // Fonction pour valider avant de continuer (appelée depuis ProfileCompletion)
  const validateStep = () => {
    setHasBeenValidated(true);
    return validateAllExperiences();
  };

  // Exposer la fonction de validation au parent
  useEffect(() => {
    // @ts-ignore
    window.validateExperienceStep = validateStep;
  }, [experiences]);

  return (
    <div className={styles.container}>
      <h2>Votre expérience professionnelle</h2>
      <p className={styles.subtitle}>
        Ajoutez vos expériences professionnelles pour compléter votre profil
      </p>

      {experiences.map((experience, index) => {
        const experienceKey = `experience-${index}`;
        const hasJobTitleError = hasBeenValidated && errors[`${experienceKey}-jobTitle`];
        const hasEmploymentTypeError = hasBeenValidated && errors[`${experienceKey}-employmentType`];
        const hasCompanyError = hasBeenValidated && errors[`${experienceKey}-company`];
        const hasLocationError = hasBeenValidated && errors[`${experienceKey}-location`];
        const hasStartMonthError = hasBeenValidated && errors[`${experienceKey}-startMonth`];
        const hasStartYearError = hasBeenValidated && errors[`${experienceKey}-startYear`];
        const hasEndMonthError = hasBeenValidated && errors[`${experienceKey}-endMonth`];
        const hasEndYearError = hasBeenValidated && errors[`${experienceKey}-endYear`];
        
        return (
          <div key={index} className={styles.experienceCard}>
            {experiences.length > 1 && (
              <div className={styles.experienceHeader}>
                <h3>Expérience {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeExperience(index)}
                  className={styles.removeButton}
                >
                  ✕ Supprimer
                </button>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Intitulé du poste et Type d'emploi sur la même ligne */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Intitulé du poste</label>
                  <input
                    type="text"
                    value={experience.jobTitle}
                    onChange={(e) => handleInputChange(index, 'jobTitle', e.target.value)}
                    className={`${styles.input} ${hasJobTitleError ? styles.inputError : ''}`}
                    placeholder="Ex: Développeur Frontend, Chef de projet..."
                  />
                  {hasJobTitleError && (
                    <div className={styles.errorText}>
                      ⚠ {errors[`${experienceKey}-jobTitle`]}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Type d'emploi</label>
                  <div className={styles.customDropdown} ref={setDropdownRef(index, 'employmentType')}>
                    <button
                      type="button"
                      className={`${styles.dropdownButton} ${hasEmploymentTypeError ? styles.inputError : ''}`}
                      onClick={() => toggleDropdown(index, 'employmentType')}
                    >
                      <span className={styles.dropdownText}>
                        {getDisplayText(index, 'employmentType', experience.employmentType)}
                      </span>
                      <span className={styles.dropdownArrow}>▼</span>
                    </button>
                    {dropdownOpen[index]?.employmentType && (
                      <div className={styles.dropdownMenu}>
                        {employmentTypes.map(type => (
                          <div
                            key={type}
                            className={`${styles.dropdownItem} ${experience.employmentType === type ? styles.selected : ''}`}
                            onClick={() => handleSelectOption(index, 'employmentType', type)}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {hasEmploymentTypeError && (
                    <div className={styles.errorText}>
                      ⚠ {errors[`${experienceKey}-employmentType`]}
                    </div>
                  )}
                </div>
              </div>

              {/* Nom de l'entreprise et Lieu sur la même ligne */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={experience.company}
                    onChange={(e) => handleInputChange(index, 'company', e.target.value)}
                    className={`${styles.input} ${hasCompanyError ? styles.inputError : ''}`}
                    placeholder="Ex: Google, Microsoft..."
                  />
                  {hasCompanyError && (
                    <div className={styles.errorText}>
                      ⚠ {errors[`${experienceKey}-company`]}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Lieu</label>
                  <input
                    type="text"
                    value={experience.location}
                    onChange={(e) => handleInputChange(index, 'location', e.target.value)}
                    className={`${styles.input} ${hasLocationError ? styles.inputError : ''}`}
                    placeholder="Ex: Paris, France..."
                  />
                  {hasLocationError && (
                    <div className={styles.errorText}>
                      ⚠ {errors[`${experienceKey}-location`]}
                    </div>
                  )}
                </div>
              </div>

              {/* Date de début seule sur une ligne avec dropdowns plus larges */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Date de début</label>
                <div className={styles.dateRow}>
                  <div className={styles.dateGroup}>
                    <div className={styles.customDropdown} ref={setDropdownRef(index, 'startMonth')}>
                      <button
                        type="button"
                        className={`${styles.dropdownButton} ${styles.large} ${hasStartMonthError ? styles.inputError : ''}`}
                        onClick={() => toggleDropdown(index, 'startMonth')}
                      >
                        <span className={styles.dropdownText}>
                          {getDisplayText(index, 'startMonth', experience.startMonth)}
                        </span>
                        <span className={styles.dropdownArrow}>▼</span>
                      </button>
                      {dropdownOpen[index]?.startMonth && (
                        <div className={styles.dropdownMenu}>
                          {months.map(month => (
                            <div
                              key={month}
                              className={`${styles.dropdownItem} ${experience.startMonth === month ? styles.selected : ''}`}
                              onClick={() => handleSelectOption(index, 'startMonth', month)}
                            >
                              {month}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {hasStartMonthError && (
                      <div className={styles.errorText}>
                        ⚠ {errors[`${experienceKey}-startMonth`]}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.dateGroup}>
                    <div className={styles.customDropdown} ref={setDropdownRef(index, 'startYear')}>
                      <button
                        type="button"
                        className={`${styles.dropdownButton} ${styles.large} ${hasStartYearError ? styles.inputError : ''}`}
                        onClick={() => toggleDropdown(index, 'startYear')}
                      >
                        <span className={styles.dropdownText}>
                          {getDisplayText(index, 'startYear', experience.startYear)}
                        </span>
                        <span className={styles.dropdownArrow}>▼</span>
                      </button>
                      {dropdownOpen[index]?.startYear && (
                        <div className={styles.dropdownMenu}>
                          {years.map(year => (
                            <div
                              key={year}
                              className={`${styles.dropdownItem} ${experience.startYear === year ? styles.selected : ''}`}
                              onClick={() => handleSelectOption(index, 'startYear', year.toString())}
                            >
                              {year}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {hasStartYearError && (
                      <div className={styles.errorText}>
                        ⚠ {errors[`${experienceKey}-startYear`]}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Poste actuel */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={experience.isCurrent}
                    onChange={(e) => updateExperience(index, 'isCurrent', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>J'occupe actuellement ce poste</span>
                </label>
              </div>

              {/* Date de fin (seulement si pas le poste actuel) */}
              {!experience.isCurrent && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date de fin</label>
                  <div className={styles.dateRow}>
                    <div className={styles.dateGroup}>
                      <div className={styles.customDropdown} ref={setDropdownRef(index, 'endMonth')}>
                        <button
                          type="button"
                          className={`${styles.dropdownButton} ${styles.large} ${hasEndMonthError ? styles.inputError : ''}`}
                          onClick={() => toggleDropdown(index, 'endMonth')}
                        >
                          <span className={styles.dropdownText}>
                            {getDisplayText(index, 'endMonth', experience.endMonth)}
                          </span>
                          <span className={styles.dropdownArrow}>▼</span>
                        </button>
                        {dropdownOpen[index]?.endMonth && (
                          <div className={styles.dropdownMenu}>
                            {months.map(month => (
                              <div
                                key={month}
                                className={`${styles.dropdownItem} ${experience.endMonth === month ? styles.selected : ''}`}
                                onClick={() => handleSelectOption(index, 'endMonth', month)}
                              >
                                {month}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {hasEndMonthError && (
                        <div className={styles.errorText}>
                          ⚠ {errors[`${experienceKey}-endMonth`]}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.dateGroup}>
                      <div className={styles.customDropdown} ref={setDropdownRef(index, 'endYear')}>
                        <button
                          type="button"
                          className={`${styles.dropdownButton} ${styles.large} ${hasEndYearError ? styles.inputError : ''}`}
                          onClick={() => toggleDropdown(index, 'endYear')}
                        >
                          <span className={styles.dropdownText}>
                            {getDisplayText(index, 'endYear', experience.endYear)}
                          </span>
                          <span className={styles.dropdownArrow}>▼</span>
                        </button>
                        {dropdownOpen[index]?.endYear && (
                          <div className={styles.dropdownMenu}>
                            {getFilteredEndYears(index).map(year => (
                              <div
                                key={year}
                                className={`${styles.dropdownItem} ${experience.endYear === year ? styles.selected : ''}`}
                                onClick={() => handleSelectOption(index, 'endYear', year.toString())}
                              >
                                {year}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {hasEndYearError && (
                        <div className={styles.errorText}>
                          ⚠ {errors[`${experienceKey}-endYear`]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description de l'expérience */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>Description de l'expérience</label>
                <textarea
                  value={experience.description}
                  onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                  className={styles.textarea}
                  placeholder="Décrivez vos responsabilités, réalisations et compétences acquises..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className={styles.addButtonContainer}>
        <button
          type="button"
          onClick={addExperience}
          className={styles.addButton}
        >
          <span className={styles.addIcon}>+</span>
          Ajouter une autre expérience
        </button>
      </div>
    </div>
  );
};

export default ExperienceStep;