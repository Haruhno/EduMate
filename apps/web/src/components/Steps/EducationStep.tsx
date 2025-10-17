import React, { useRef, useState, useEffect } from 'react';
import styles from './EducationStep.module.css';

interface EducationStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
}

interface University {
  name: string;
  country: string;
  domains: string[];
  web_pages: string[];
  'state-province'?: string;
}

const EducationStep: React.FC<EducationStepProps> = ({
  profileData,
  setProfileData,
  role
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);

  // Liste complète des pays
  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", 
    "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", 
    "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
    "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", 
    "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", 
    "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", 
    "Comoros", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", 
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", 
    "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
    "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", 
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", 
    "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
    "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", 
    "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", 
    "Kiribati", "Korea, Democratic People's Republic of (North Korea)", 
    "Korea, Republic of (South Korea)", "Kosovo", "Kuwait", "Kyrgyzstan", 
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", 
    "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", 
    "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", 
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", 
    "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", 
    "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", 
    "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", 
    "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Republic of the Congo", 
    "Romania", "Russian Federation", "Rwanda", "Saint Kitts and Nevis", 
    "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", 
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", 
    "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", 
    "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", 
    "Suriname", "Sweden", "Switzerland", "Syrian Arab Republic", "Taiwan", 
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", 
    "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", 
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
    "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", 
    "Vatican City", "Venezuela", "Viet Nam", "Yemen", "Zambia", "Zimbabwe"
  ];

  // Pays qui ne fonctionnent pas bien avec l'API ou nécessitent une saisie manuelle
  const problematicCountries = [
    "United States of America", 
    "United States",
    "USA",
    "US"
  ];

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isProblematicCountry, setIsProblematicCountry] = useState<boolean>(false);

  // Vérifier si le pays sélectionné est problématique
  useEffect(() => {
    const isProblematic = problematicCountries.some(country => 
      selectedCountry.toLowerCase().includes(country.toLowerCase())
    );
    setIsProblematicCountry(isProblematic);
    
    if (isProblematic) {
      setUniversities([]);
      setFilteredUniversities([]);
      setSearchTerm('');
      setIsManualEntry(true);
      setProfileData((prev: any) => ({
        ...prev,
        school: ''
      }));
    } else {
      setIsManualEntry(false);
    }
  }, [selectedCountry]);

  // Charger les universités quand un pays est sélectionné (sauf pour les pays problématiques)
  useEffect(() => {
    if (selectedCountry && !isProblematicCountry) {
      fetchUniversities(selectedCountry);
    } else {
      setUniversities([]);
      setFilteredUniversities([]);
    }
  }, [selectedCountry, isProblematicCountry]);

  // Filtrer les universités selon la recherche
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUniversities(universities.slice(0, 10));
    } else {
      const filtered = universities.filter(uni =>
        uni.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUniversities(filtered.slice(0, 10));
    }
  }, [searchTerm, universities]);

  const fetchUniversities = async (country: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: University[] = await response.json();
      
      // Trier les universités par nom
      const sortedUniversities = data.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      );
      
      setUniversities(sortedUniversities);
      setFilteredUniversities(sortedUniversities.slice(0, 10));
    } catch (error) {
      console.error('Erreur lors du chargement des universités:', error);
      setUniversities([]);
      setFilteredUniversities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'country') {
      setSelectedCountry(value);
      setSearchTerm('');
      setIsManualEntry(false);
      setProfileData((prev: any) => ({
        ...prev,
        country: value,
        school: ''
      }));
    } else {
      setProfileData((prev: any) => ({
        ...prev,
        [name]: value
      }));
    }
    
    window.dispatchEvent(
      new CustomEvent('profileFieldUpdated', { detail: { field: name } })
    );
  };

  const handleSchoolSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Mettre à jour profileData dans tous les cas
    setProfileData((prev: any) => ({
      ...prev,
      school: value
    }));
    
    // Si l'utilisateur efface tout le texte, revenir au mode normal
    if (value === '' && isManualEntry && !isProblematicCountry) {
      setIsManualEntry(false);
    }
    
    // Afficher les suggestions seulement si on n'est pas en mode saisie manuelle
    if (!isManualEntry && !isProblematicCountry) {
      setShowSuggestions(true);
    }
  };

  const handleUniversitySelect = (universityName: string) => {
    setSearchTerm(universityName);
    setProfileData((prev: any) => ({
      ...prev,
      school: universityName
    }));
    setShowSuggestions(false);
    setIsManualEntry(false);
  };

  const handleOtherOption = () => {
    setSearchTerm("");
    setProfileData((prev: any) => ({
      ...prev,
      school: ""
    }));
    setShowSuggestions(false);
    setIsManualEntry(true);
    // Focus sur l'input pour permettre la saisie manuelle
    setTimeout(() => {
      const schoolInput = document.getElementById('school') as HTMLInputElement;
      if (schoolInput) {
        schoolInput.focus();
      }
    }, 100);
  };

  // Fonction pour revenir au mode de sélection normale
  const handleBackToSelection = () => {
    setSearchTerm('');
    setProfileData((prev: any) => ({
      ...prev,
      school: ''
    }));
    setIsManualEntry(false);
    setShowSuggestions(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileData((prev: any) => ({
        ...prev,
        diplomaFile: file
      }));
      window.dispatchEvent(
        new CustomEvent('profileFieldUpdated', { detail: { field: 'diplomaFile' } })
      );
    }
  };

  const educationLevels = [
    'Brevet des collèges',
    'Baccalauréat',
    'Bac+2 (BTS, DUT)',
    'BUT',
    'Licence',
    'Master',
    'Doctorat',
    'Autre'
  ];

  const fields = [
    'Agriculture',
    'Architecture',
    'Art',
    'Astronomie',
    'Biologie',
    'Chimie',
    'Communication',
    'Comptabilité',
    'Droit',
    'Design',
    'Économie',
    'Éducation',
    'Électronique',
    'Énergie',
    'Enseignement',
    'Environnement',
    'Finance',
    'Géographie',
    'Génie civil',
    'Génie électrique',
    'Génie industriel',
    'Génie informatique',
    'Génie mécanique',
    'Gestion',
    'Histoire',
    'Informatique',
    'Journalisme',
    'Langues',
    'Littérature',
    'Management',
    'Marketing',
    'Mathématiques',
    'Médecine',
    'Musique',
    'Philosophie',
    'Physique',
    'Psychologie',
    'Sciences politiques',
    'Sciences sociales',
    'Sociologie',
    'Sport',
    'Théâtre',
    'Tourisme',
    'Transport',
    'Urbanisme',
    'Autre'
  ];

  return (
    <div className={styles.container}>
      <h2>{role === 'student' ? 'Vos études' : 'Vos diplômes'}</h2>
      <p className={styles.subtitle}>
        {role === 'student' 
          ? 'Renseignez votre parcours académique' 
          : 'Ajoutez vos diplômes et certifications'
        }
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="educationLevel" className={styles.label}>
            {role === 'student' ? 'Niveau d\'études' : 'Niveau du diplôme'}
          </label>
          <select
            id="educationLevel"
            name="educationLevel"
            value={profileData.educationLevel}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            {educationLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="field" className={styles.label}>Domaine</label>
          <select
            id="field"
            name="field"
            value={profileData.field}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez</option>
            {fields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        {/* Champ pays avec liste statique */}
        <div className={styles.formGroup}>
          <label htmlFor="country" className={styles.label}>Pays</label>
          <select
            id="country"
            name="country"
            value={selectedCountry}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Sélectionnez un pays</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="school" className={styles.label}>
            {role === 'student' ? 'Établissement' : 'Établissement de formation'}
          </label>
          <div className={styles.searchContainer}>
            <input
              type="text"
              id="school"
              name="school"
              value={searchTerm}
              onChange={handleSchoolSearchChange}
              onFocus={() => {
                if (!isManualEntry && !isProblematicCountry) {
                  setShowSuggestions(true);
                }
              }}
              className={styles.input}
              placeholder={
                isProblematicCountry || isManualEntry
                  ? `Saisissez le nom de votre établissement${selectedCountry ? ` (${selectedCountry})` : ''}`
                  : selectedCountry 
                    ? `Recherchez une université en ${selectedCountry}...` 
                    : "Sélectionnez d'abord un pays"
              }
              disabled={!selectedCountry || (isLoading && !isProblematicCountry && !isManualEntry)}
            />
            
            {/* Bouton pour revenir à la sélection quand on est en mode manuel */}
            {isManualEntry && !isProblematicCountry && (
              <button
                type="button"
                onClick={handleBackToSelection}
                className={styles.backButton}
              >
                ← Retour à la sélection
              </button>
            )}
            
            {/* Suggestions pour les pays normaux quand on n'est pas en mode saisie manuelle */}
            {showSuggestions && selectedCountry && !isLoading && !isProblematicCountry && !isManualEntry && (
              <div className={styles.suggestionsDropdown}>
                {/* Option "Autre" toujours en premier */}
                <div
                  className={styles.suggestionItem}
                  onClick={handleOtherOption}
                >
                  <span className={styles.universityName}>Autre</span>
                  <span className={styles.suggestionHint}>Saisir manuellement</span>
                </div>

                {/* Suggestions d'universités */}
                {filteredUniversities.map(uni => (
                  <div
                    key={`${uni.name}-${uni.country}-${uni.domains[0]}`}
                    className={styles.suggestionItem}
                    onClick={() => handleUniversitySelect(uni.name)}
                  >
                    <span className={styles.universityName}>{uni.name}</span>
                    <span className={styles.universityLocation}>
                      {uni.country}
                      {uni['state-province'] ? ` — ${uni['state-province']}` : ''}
                    </span>
                  </div>
                ))}

                {filteredUniversities.length === 0 && searchTerm && (
                  <div className={styles.noResults}>
                    Aucune université trouvée. Utilisez l'option "Autre".
                  </div>
                )}
              </div>
            )}

            {/* Message d'information pour les pays problématiques ou mode saisie manuelle */}
            {(isProblematicCountry || isManualEntry) && (
              <div className={styles.helpText}>
                {isProblematicCountry 
                  ? `Pour ${selectedCountry}, veuillez saisir directement le nom de votre établissement.`
                  : "Saisissez le nom de votre établissement manuellement."
                }
              </div>
            )}
          </div>

          {isLoading && !isProblematicCountry && !isManualEntry && (
            <p className={styles.helpText}>Chargement des universités...</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="year" className={styles.label}>Année</label>
          <input
            type="text"
            id="year"
            name="year"
            value={profileData.year}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="2023-2024"
          />
        </div>

        {role === 'tutor' && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Diplôme ou certificat</label>
            <div className={styles.fileUpload}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadButton}
              >
                📎 Téléverser un fichier
              </button>
              {profileData.diplomaFile && (
                <span className={styles.fileName}>
                  {profileData.diplomaFile.name}
                </span>
              )}
            </div>
            <p className={styles.helpText}>
              Formats acceptés : PDF, JPG, PNG (max. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationStep;