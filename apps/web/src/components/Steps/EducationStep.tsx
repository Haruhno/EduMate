import React, { useRef, useState, useEffect } from 'react';
import styles from './EducationStep.module.css';

interface EducationStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  touched: { [key: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

interface Diploma {
  id?: string;
  educationLevel: string;
  field: string;
  school: string;
  country: string;
  startYear: number | '';
  endYear: number | '';
  diplomaFile?: File | null;
  isCurrent: boolean;
}

interface University {
  name: string;
  country: string;
  domains: string[];
  web_pages: string[];
  'state-province'?: string;
}

interface DropdownState {
  [key: number]: {
    educationLevel: boolean;
    field: boolean;
    country: boolean;
    startYear: boolean;
    endYear: boolean;
  };
}

type DropdownField = 'educationLevel' | 'field' | 'country' | 'startYear' | 'endYear';

const EducationStep: React.FC<EducationStepProps> = ({
  profileData,
  setProfileData,
  role,
  errors,
  setErrors
}) => {
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const dropdownRefs = useRef<{ [key: number]: { [key in DropdownField]?: HTMLDivElement | null } }>({});
  const countryInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const countryDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasBeenValidated, setHasBeenValidated] = useState(false);

  const [universities, setUniversities] = useState<{ [key: number]: University[] }>({});
  const [isLoading, setIsLoading] = useState<{ [key: number]: boolean }>({});
  const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>({});
  const [countrySearchTerms, setCountrySearchTerms] = useState<{ [key: number]: string }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [showCountrySuggestions, setShowCountrySuggestions] = useState<{ [key: number]: boolean }>({});
  const [isManualEntry, setIsManualEntry] = useState<{ [key: number]: boolean }>({});
  const [selectedCountries, setSelectedCountries] = useState<{ [key: number]: string }>({});
  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({});
  

  // Pays qui ne fonctionnent pas bien avec l'API
  const problematicCountries = [
    "United States of America", 
    "United States",
    "USA",
    "US",
    "États-Unis"
  ];

  const countries = [
    "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", 
    "Antigua-et-Barbuda", "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", 
    "Azerbaïdjan", "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", 
    "Bénin", "Bhoutan", "Biélorussie", "Birmanie", "Bolivie", "Bosnie-Herzégovine", "Botswana", 
    "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge", "Cameroun", 
    "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo", 
    "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", 
    "Danemark", "Djibouti", "Dominique", "Égypte", "Émirats arabes unis", "Équateur", 
    "Érythrée", "Espagne", "Estonie", "Eswatini", "États-Unis", "Éthiopie", "Fidji", 
    "Finlande", "France", "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce", "Grenade", 
    "Guatemala", "Guinée", "Guinée équatoriale", "Guinée-Bissau", "Guyana", "Haïti", 
    "Honduras", "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", 
    "Israël", "Italie", "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya", 
    "Kirghizistan", "Kiribati", "Kosovo", "Koweït", "Laos", "Lesotho", "Lettonie", 
    "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord", 
    "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Marshall", 
    "Maurice", "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", 
    "Monténégro", "Mozambique", "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", 
    "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", 
    "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", 
    "Pérou", "Philippines", "Pologne", "Portugal", "Qatar", "République centrafricaine", 
    "République démocratique du Congo", "République dominicaine", "République tchèque", 
    "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "Saint-Christophe-et-Niévès", "Sainte-Lucie", 
    "Saint-Marin", "Saint-Vincent-et-les-Grenadines", "Salomon", "Salvador", "Samoa", 
    "Sao Tomé-et-Principe", "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour", 
    "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", 
    "Suisse", "Suriname", "Syrie", "Tadjikistan", "Tanzanie", "Tchad", "Thaïlande", 
    "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago", "Tunisie", "Turkménistan", 
    "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican", "Venezuela", 
    "Vietnam", "Yémen", "Zambie", "Zimbabwe"
  ].sort((a, b) => a.localeCompare(b, 'fr'));

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
    'Administration', 'Agronomie', 'Archéologie', 'Architecture', 'Art', 'Astronomie',
    'Audiovisuel', 'Banque', 'Biologie', 'Chimie', 'Commerce', 'Communication',
    'Comptabilité', 'Droit', 'Économie', 'Éducation', 'Électronique', 'Énergie',
    'Enseignement', 'Environnement', 'Finance', 'Génie civil', 'Génie électrique',
    'Génie industriel', 'Génie informatique', 'Génie mécanique', 'Gestion',
    'Graphisme', 'Hôtellerie', 'Histoire', 'Informatique', 'Journalisme',
    'Langues', 'Littérature', 'Logistique', 'Marketing', 'Mathématiques',
    'Médecine', 'Musique', 'Pharmacie', 'Philosophie', 'Physique', 'Psychologie',
    'Relations internationales', 'Ressources humaines', 'Sciences politiques',
    'Sciences sociales', 'Sociologie', 'Sport', 'Statistiques', 'Tourisme',
    'Transport', 'Urbanisme'
  ].sort((a, b) => a.localeCompare(b, 'fr'));

  fields.push('Autre');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  // Mapping des pays pour l'API
  const countryMapping: { [key: string]: string } = {
    'France': 'France',
    'États-Unis': 'United States', 
    'Royaume-Uni': 'United Kingdom',
    'Canada': 'Canada',
    'Allemagne': 'Germany',
    'Espagne': 'Spain',
    'Italie': 'Italy',
    'Australie': 'Australia',
    'Japon': 'Japan',
    'Chine': 'China',
    'Brésil': 'Brazil',
    'Inde': 'India'
  };

  // Vérifier si le pays est problématique
  const isProblematicCountry = (country: string) => {
    return problematicCountries.some(problematic => 
      country.toLowerCase().includes(problematic.toLowerCase())
    );
  };

  // Fonction pour détecter si un diplôme a commencé à être rempli
  const hasDiplomaStartedFilling = (diploma: Diploma): boolean => {
    return (
      diploma.educationLevel.trim() !== '' ||
      diploma.field.trim() !== '' ||
      diploma.school.trim() !== '' ||
      diploma.country.trim() !== '' ||
      diploma.startYear !== '' ||
      diploma.endYear !== '' ||
      diploma.isCurrent
    );
  };

  // Validation complète de tous les diplômes
  const validateAllDiplomas = () => {
    const newErrors: { [key: string]: string } = { ...errors };
    
    // Supprimer les anciennes erreurs de diplômes
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith('diploma-')) {
        delete newErrors[key];
      }
    });

    let hasAnyError = false;

    diplomas.forEach((diploma, index) => {
      const diplomaKey = `diploma-${index}`;
      const hasStartedFilling = hasDiplomaStartedFilling(diploma);

      if (hasStartedFilling) {
        // Vérifier que tous les champs obligatoires sont remplis
        if (!diploma.educationLevel?.trim()) {
          newErrors[`${diplomaKey}-educationLevel`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!diploma.field?.trim()) {
          newErrors[`${diplomaKey}-field`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!diploma.school?.trim()) {
          newErrors[`${diplomaKey}-school`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!diploma.country?.trim()) {
          newErrors[`${diplomaKey}-country`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        if (!diploma.startYear) {
          newErrors[`${diplomaKey}-startYear`] = "Veuillez renseigner cette information";
          hasAnyError = true;
        }

        // Validation pour l'année de fin si ce n'est pas en cours
        if (!diploma.isCurrent) {
          if (!diploma.endYear) {
            newErrors[`${diplomaKey}-endYear`] = "Veuillez renseigner cette information";
            hasAnyError = true;
          }
        }

        // Validation de la cohérence des années
        if (diploma.startYear && diploma.endYear && !diploma.isCurrent) {
          if (diploma.endYear < diploma.startYear) {
            newErrors[`${diplomaKey}-endYear`] = "L'année de fin ne peut pas être antérieure à l'année de début";
            hasAnyError = true;
          }
        }
      }
    });

    setErrors(newErrors);
    setHasBeenValidated(true);
    return !hasAnyError;
  };

  // Exposer la fonction de validation au parent
  useEffect(() => {
    // @ts-ignore
    window.validateEducationStep = validateAllDiplomas;
  }, [diplomas]);

  // Préremplissage des données
  useEffect(() => {
    if (profileData?.diplomas && profileData.diplomas.length > 0) {
      console.log('Initialisation avec les diplômes existants:', profileData.diplomas);
      setDiplomas(profileData.diplomas);
      
      // Initialiser tous les états avec les données existantes
      const initialSearchTerms: { [key: number]: string } = {};
      const initialCountrySearchTerms: { [key: number]: string } = {};
      const initialSelectedCountries: { [key: number]: string } = {};
      const initialIsManualEntry: { [key: number]: boolean } = {};

      profileData.diplomas.forEach((diploma: Diploma, index: number) => {
        initialSearchTerms[index] = diploma.school || '';
        initialCountrySearchTerms[index] = diploma.country || '';
        
        if (diploma.country) {
          initialSelectedCountries[index] = diploma.country;
          // Si l'école est remplie, considérer comme entrée manuelle
          if (diploma.school && diploma.school.trim() !== '') {
            initialIsManualEntry[index] = true;
          }
        }
      });

      setSearchTerms(initialSearchTerms);
      setCountrySearchTerms(initialCountrySearchTerms);
      setSelectedCountries(initialSelectedCountries);
      setIsManualEntry(initialIsManualEntry);
      
      // Charger les universités pour les pays existants
      profileData.diplomas.forEach((diploma: Diploma, index: number) => {
        if (diploma.country && !isProblematicCountry(diploma.country)) {
          fetchUniversities(diploma.country, index);
        }
      });
    } else {
      // Si pas de diplômes, créer un diplôme vide
      setDiplomas([{
        educationLevel: '', field: '', school: '', country: '', startYear: '', endYear: '',
        diplomaFile: null, isCurrent: false
      }]);
    }
    setIsInitialized(true);
  }, [profileData.diplomas]);

  // Mettre à jour profileData quand les diplômes changent
  useEffect(() => {
    if (isInitialized) {
      console.log('Mise à jour de profileData avec diplômes:', diplomas);
      setProfileData((prevData: any) => ({
        ...prevData,
        diplomas: diplomas
      }));

      // Si on a déjà validé une fois, revalider à chaque changement
      if (hasBeenValidated) {
        validateAllDiplomas();
      }
    }
  }, [diplomas, isInitialized, setProfileData]);

  // Chargement des universités
  const fetchUniversities = async (country: string, index: number) => {
    if (!country || isProblematicCountry(country)) {
      setUniversities(prev => ({ ...prev, [index]: [] }));
      setIsManualEntry(prev => ({ ...prev, [index]: true }));
      return;
    }

    setIsLoading(prev => ({ ...prev, [index]: true }));
    try {
      const englishCountry = countryMapping[country] || country;
      const response = await fetch(
        `http://universities.hipolabs.com/search?country=${encodeURIComponent(englishCountry)}`
      );
      
      if (response.ok) {
        const data: University[] = await response.json();
        const sortedUniversities = data.sort((a, b) => 
          a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
        );
        
        setUniversities(prev => ({
          ...prev,
          [index]: sortedUniversities
        }));
        
        setIsManualEntry(prev => ({ ...prev, [index]: false }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des universités:', error);
      setUniversities(prev => ({ ...prev, [index]: [] }));
      setIsManualEntry(prev => ({ ...prev, [index]: true }));
    } finally {
      setIsLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Filtrer les pays selon la recherche
  const getFilteredCountries = (index: number) => {
    const searchTerm = countrySearchTerms[index] || '';
    if (!searchTerm.trim()) {
      return countries; // Afficher tous les pays si pas de recherche
    }
    
    const filtered = countries.filter(country =>
      country.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    return filtered; // Afficher tous les résultats filtrés
  };

  // Mettre en évidence la partie correspondante
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    
    if (lowerText.startsWith(lowerSearch)) {
      const match = text.substring(0, searchTerm.length);
      const after = text.substring(searchTerm.length);
      
      return (
        <>
          <span className={styles.highlight}>{match}</span>
          {after}
        </>
      );
    }
    
    return text;
  };

  // VALIDATION DES ANNÉES 
  const validateYears = (index: number, startYear: number | '', endYear: number | '', isCurrent: boolean) => {
    const newErrors = { ...errors };
    const diplomaKey = `diploma-${index}-endYear`;
    
    if (startYear && endYear && !isCurrent) {
      if (endYear < startYear) {
        newErrors[diplomaKey] = "L'année de fin ne peut pas être antérieure à l'année de début";
      } else {
        delete newErrors[diplomaKey];
      }
    } else {
      delete newErrors[diplomaKey];
    }

    setErrors(newErrors);
  };

  // Fermer les dropdowns quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fermer les dropdowns custom (niveau, domaine, années)
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

      // Fermer les dropdowns de pays
      Object.entries(countryDropdownRefs.current).forEach(([indexStr, ref]) => {
        const index = parseInt(indexStr);
        if (ref && !ref.contains(event.target as Node)) {
          setShowCountrySuggestions(prev => ({
            ...prev,
            [index]: false
          }));
        }
      });

      // Fermer les suggestions d'établissements
      Object.entries(countryInputRefs.current).forEach(([indexStr, ref]) => {
        const index = parseInt(indexStr);
        if (ref && !ref.contains(event.target as Node)) {
          setShowSuggestions(prev => ({
            ...prev,
            [index]: false
          }));
        }
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
    // Gestion spéciale pour "En cours" dans endYear
    if (field === 'endYear' && value === 'En cours') {
      updateDiploma(index, 'isCurrent', true);
      setDropdownOpen(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [field]: false
        }
      }));
      return;
    }
    
    // Conversion des années en number
    if (field === 'startYear' || field === 'endYear') {
      const yearValue = value === '' ? '' : parseInt(value);
      updateDiploma(index, field, yearValue);
    } else {
      updateDiploma(index, field, value);
    }
    
    setDropdownOpen(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: false
      }
    }));

    if (field === 'country') {
      handleCountryChange(index, value);
    }
  };

  // Gestion des diplômes
  const addDiploma = () => {
    const newDiploma: Diploma = {
      educationLevel: '',
      field: '',
      school: '',
      country: '',
      startYear: '',
      endYear: '',
      diplomaFile: null,
      isCurrent: false
    };
    
    setDiplomas(prev => [...prev, newDiploma]);
  };

  const removeDiploma = (index: number) => {
    if (diplomas.length > 1) {
      setDiplomas(prev => prev.filter((_, i) => i !== index));
      
      // Nettoyer les états
      setSearchTerms(prev => ({ ...prev, [index]: '' }));
      setCountrySearchTerms(prev => ({ ...prev, [index]: '' }));
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
      setShowCountrySuggestions(prev => ({ ...prev, [index]: false }));
      setIsManualEntry(prev => ({ ...prev, [index]: false }));
      setSelectedCountries(prev => ({ ...prev, [index]: '' }));
      setUniversities(prev => ({ ...prev, [index]: [] }));
      setIsLoading(prev => ({ ...prev, [index]: false }));
      
      // Nettoyer les erreurs
      const diplomaKey = `diploma-${index}`;
      setErrors(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith(diplomaKey)) {
            delete updated[key];
          }
        });
        return updated;
      });
    }
  };

  const updateDiploma = (index: number, field: string, value: any) => {
    setDiplomas(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Validation des années si nécessaire
      if (field === 'startYear' || field === 'endYear' || field === 'isCurrent') {
        const startYear = field === 'startYear' ? value : updated[index].startYear;
        const endYear = field === 'endYear' ? value : updated[index].endYear;
        const isCurrent = field === 'isCurrent' ? value : updated[index].isCurrent;
        validateYears(index, startYear, endYear, isCurrent);
      }
      
      return updated;
    });

    if (field === 'isCurrent' && value === true) {
      setDiplomas(prev => prev.map((diploma, i) => 
        i === index ? { ...diploma, isCurrent: true } : { ...diploma, isCurrent: false }
      ));
    }
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateDiploma(index, 'diplomaFile', file);
    }
  };

  // Gestion du pays
  const handleCountryChange = (index: number, value: string) => {
    setCountrySearchTerms(prev => ({ ...prev, [index]: value }));
    updateDiploma(index, 'country', value);
    
    if (!selectedCountries[index] && value) {
      setSelectedCountries(prev => ({ ...prev, [index]: value }));
    }
  };

  const handleCountrySelect = (index: number, country: string) => {
    setCountrySearchTerms(prev => ({ ...prev, [index]: country }));
    updateDiploma(index, 'country', country);
    setSelectedCountries(prev => ({ ...prev, [index]: country }));
    setShowCountrySuggestions(prev => ({ ...prev, [index]: false }));
    setSearchTerms(prev => ({ ...prev, [index]: '' }));
    setIsManualEntry(prev => ({ ...prev, [index]: false }));
    
    // Charger les universités pour le nouveau pays
    fetchUniversities(country, index);
  };

  const handleCountryFocus = (index: number) => {
    if (countrySearchTerms[index]) {
      setShowCountrySuggestions(prev => ({ ...prev, [index]: true }));
    }
  };

  const handleCountryInputChange = (index: number, value: string) => {
    handleCountryChange(index, value);
    setShowCountrySuggestions(prev => ({ ...prev, [index]: true }));
  };

  // Gestion de l'établissement
  const handleSchoolSearch = (index: number, value: string) => {
    setSearchTerms(prev => ({ ...prev, [index]: value }));
    updateDiploma(index, 'school', value);
    
    // Afficher les suggestions quand on tape
    if (!isManualEntry[index] && selectedCountries[index]) {
      setShowSuggestions(prev => ({ ...prev, [index]: true }));
    }
    
    if (value === '' && isManualEntry[index]) {
      setIsManualEntry(prev => ({ ...prev, [index]: false }));
    }
  };

  // FILTRAGE DES UNIVERSITÉS
  const getFilteredUniversities = (index: number) => {
    const universitiesList = universities[index] || [];
    const searchTerm = searchTerms[index] || '';
    
    if (searchTerm.trim() === '') {
      return universitiesList.slice(0, 10);
    } else {
      const filtered = universitiesList.filter(uni =>
        uni.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filtered.slice(0, 10);
    }
  };

  const handleUniversitySelect = (index: number, universityName: string) => {
    setSearchTerms(prev => ({ ...prev, [index]: universityName }));
    updateDiploma(index, 'school', universityName);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
    setIsManualEntry(prev => ({ ...prev, [index]: false }));
  };

  const handleOtherOption = (index: number) => {
    setSearchTerms(prev => ({ ...prev, [index]: "" }));
    updateDiploma(index, 'school', "");
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
    setIsManualEntry(prev => ({ ...prev, [index]: true }));
  };

  const setFileInputRef = (index: number) => (el: HTMLInputElement | null) => {
    fileInputRefs.current[index] = el;
  };

  const setDropdownRef = (index: number, field: DropdownField) => (el: HTMLDivElement | null) => {
    if (!dropdownRefs.current[index]) {
      dropdownRefs.current[index] = {};
    }
    dropdownRefs.current[index][field] = el;
  };

  const setCountryInputRef = (index: number) => (el: HTMLInputElement | null) => {
    countryInputRefs.current[index] = el;
  };

  const setCountryDropdownRef = (index: number) => (el: HTMLDivElement | null) => {
    countryDropdownRefs.current[index] = el;
  };

  const getDisplayText = (index: number, field: DropdownField, value: string | number) => {
    if (!value) {
      switch (field) {
        case 'educationLevel': return 'Sélectionnez un niveau';
        case 'field': return 'Sélectionnez un domaine';
        case 'country': return 'Sélectionnez un pays';
        case 'startYear': return 'Sélectionnez une année';
        case 'endYear': return 'Sélectionnez une année';
        default: return 'Sélectionnez';
      }
    }
    return value.toString();
  };

  // Filtrer les années de fin en fonction de l'année de début
  const getFilteredEndYears = (index: number) => {
    const startYear = diplomas[index].startYear;
    if (!startYear) return years;
    return years.filter(year => year >= startYear);
  };

  return (
    <div className={styles.container}>
      <h2>{role === 'student' ? 'Vos études' : 'Vos diplômes'}</h2>
      <p className={styles.subtitle}>
        {role === 'student' 
          ? 'Ajoutez votre parcours académique' 
          : 'Ajoutez vos diplômes et certifications'
        }
      </p>

      {diplomas.map((diploma, index) => {
        const filteredUnis = getFilteredUniversities(index);
        const isProblematic = selectedCountries[index] && isProblematicCountry(selectedCountries[index]);
        const endYearErrorKey = `diploma-${index}-endYear`;
        const hasEndYearError = errors[endYearErrorKey];
        
        // Variables pour les erreurs de chaque champ
        const diplomaKey = `diploma-${index}`;
        const hasEducationLevelError = hasBeenValidated && errors[`${diplomaKey}-educationLevel`];
        const hasFieldError = hasBeenValidated && errors[`${diplomaKey}-field`];
        const hasSchoolError = hasBeenValidated && errors[`${diplomaKey}-school`];
        const hasCountryError = hasBeenValidated && errors[`${diplomaKey}-country`];
        const hasStartYearError = hasBeenValidated && errors[`${diplomaKey}-startYear`];
        const hasEndYearRequiredError = hasBeenValidated && errors[`${diplomaKey}-endYear`] && 
                                       errors[`${diplomaKey}-endYear`] === "Veuillez renseigner cette information";
        
        return (
          <div key={index} className={styles.diplomaCard}>
            {diplomas.length > 1 && (
              <div className={styles.diplomaHeader}>
                <h3>Diplôme {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeDiploma(index)}
                  className={styles.removeButton}
                >
                  ✕ Supprimer
                </button>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Niveau d'études */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {role === 'student' ? 'Niveau d\'études' : 'Niveau du diplôme'}
                </label>
                <div className={styles.customDropdown} ref={setDropdownRef(index, 'educationLevel')}>
                  <button
                    type="button"
                    className={`${styles.dropdownButton} ${hasEducationLevelError ? styles.inputError : ''}`}
                    onClick={() => toggleDropdown(index, 'educationLevel')}
                  >
                    <span className={styles.dropdownText}>
                      {getDisplayText(index, 'educationLevel', diploma.educationLevel)}
                    </span>
                    <span className={styles.dropdownArrow}>▼</span>
                  </button>
                  {dropdownOpen[index]?.educationLevel && (
                    <div className={styles.dropdownMenu}>
                      {educationLevels.map(level => (
                        <div
                          key={level}
                          className={`${styles.dropdownItem} ${diploma.educationLevel === level ? styles.selected : ''}`}
                          onClick={() => handleSelectOption(index, 'educationLevel', level)}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {hasEducationLevelError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-educationLevel`]}
                  </div>
                )}
              </div>

              {/* Domaine */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Domaine</label>
                <div className={styles.customDropdown} ref={setDropdownRef(index, 'field')}>
                  <button
                    type="button"
                    className={`${styles.dropdownButton} ${hasFieldError ? styles.inputError : ''}`}
                    onClick={() => toggleDropdown(index, 'field')}
                  >
                    <span className={styles.dropdownText}>
                      {getDisplayText(index, 'field', diploma.field)}
                    </span>
                    <span className={styles.dropdownArrow}>▼</span>
                  </button>
                  {dropdownOpen[index]?.field && (
                    <div className={styles.dropdownMenu}>
                      {fields.map(field => (
                        <div
                          key={field}
                          className={`${styles.dropdownItem} ${diploma.field === field ? styles.selected : ''}`}
                          onClick={() => handleSelectOption(index, 'field', field)}
                        >
                          {field}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {hasFieldError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-field`]}
                  </div>
                )}
              </div>

              {/* Pays */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Pays</label>
                <div className={styles.searchContainer} ref={setCountryDropdownRef(index)}>
                  <input
                    ref={setCountryInputRef(index)}
                    type="text"
                    value={countrySearchTerms[index] || ''}
                    onChange={(e) => handleCountryInputChange(index, e.target.value)}
                    onFocus={() => handleCountryFocus(index)}
                    className={`${styles.input} ${hasCountryError ? styles.inputError : ''}`}
                    placeholder="Recherchez un pays..."
                  />
                  
                  {showCountrySuggestions[index] && (
                    <div className={styles.suggestionsDropdown}>
                      {getFilteredCountries(index).map((country) => (
                        <div
                          key={country}
                          className={`${styles.suggestionItem} ${diploma.country === country ? styles.selected : ''}`}
                          onClick={() => handleCountrySelect(index, country)}
                        >
                          <span className={styles.countryName}>
                            {highlightMatch(country, countrySearchTerms[index] || '')}
                          </span>
                        </div>
                      ))}
                      
                      {getFilteredCountries(index).length === 0 && (
                        <div className={styles.noResults}>
                          Aucun pays trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {hasCountryError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-country`]}
                  </div>
                )}
              </div>

              {/* Établissement */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {role === 'student' ? 'Établissement' : 'Établissement de formation'}
                </label>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    value={searchTerms[index] || ''}
                    onChange={(e) => handleSchoolSearch(index, e.target.value)}
                    onFocus={() => {
                      if (!isManualEntry[index] && selectedCountries[index] && !isProblematic) {
                        setShowSuggestions(prev => ({ ...prev, [index]: true }));
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowSuggestions(prev => ({ ...prev, [index]: false }));
                      }, 200);
                    }}
                    className={`${styles.input} ${hasSchoolError ? styles.inputError : ''}`}
                    placeholder={
                      isManualEntry[index] || isProblematic
                        ? `Saisissez le nom de votre établissement${selectedCountries[index] ? ` (${selectedCountries[index]})` : ''}`
                        : selectedCountries[index] 
                          ? `Recherchez une université en ${selectedCountries[index]}...` 
                          : "Sélectionnez d'abord un pays"
                    }
                    disabled={!selectedCountries[index]}
                  />
                  
                  {/* SUGGESTIONS D'ÉTABLISSEMENTS */}
                  {showSuggestions[index] && selectedCountries[index] && !isManualEntry[index] && !isProblematic && (
                    <div className={styles.suggestionsDropdown}>
                      {isLoading[index] ? (
                        <div className={styles.loading}>Chargement des universités...</div>
                      ) : (
                        <>
                          {/* Suggestions d'universités */}
                          {filteredUnis.map((uni) => (
                            <div
                              key={`${index}-${uni.name}`}
                              className={styles.suggestionItem}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleUniversitySelect(index, uni.name);
                              }}
                            >
                              <span className={styles.universityName}>{uni.name}</span>
                            </div>
                          ))}

                          {/* Option "Autre" */}
                          <div
                            className={styles.suggestionItem}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleOtherOption(index);
                            }}
                          >
                            <span className={styles.universityName}>Autre</span>
                            <span className={styles.suggestionHint}>Saisir manuellement</span>
                          </div>

                          {filteredUnis.length === 0 && searchTerms[index] && (
                            <div className={styles.noResults}>
                              Aucune université trouvée. Utilisez l'option "Autre".
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {hasSchoolError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-school`]}
                  </div>
                )}
              </div>

              {/* Année de début */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Année de début</label>
                <div className={styles.customDropdown} ref={setDropdownRef(index, 'startYear')}>
                  <button
                    type="button"
                    className={`${styles.dropdownButton} ${hasStartYearError ? styles.inputError : ''}`}
                    onClick={() => toggleDropdown(index, 'startYear')}
                  >
                    <span className={styles.dropdownText}>
                      {getDisplayText(index, 'startYear', diploma.startYear)}
                    </span>
                    <span className={styles.dropdownArrow}>▼</span>
                  </button>
                  {dropdownOpen[index]?.startYear && (
                    <div className={styles.dropdownMenu}>
                      {years.map(year => (
                        <div
                          key={year}
                          className={`${styles.dropdownItem} ${diploma.startYear === year ? styles.selected : ''}`}
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
                    ⚠ {errors[`${diplomaKey}-startYear`]}
                  </div>
                )}
              </div>

              {/* Année de fin */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Année de fin</label>
                <div className={styles.customDropdown} ref={setDropdownRef(index, 'endYear')}>
                  <button
                    type="button"
                    className={`${styles.dropdownButton} ${hasEndYearError || hasEndYearRequiredError ? styles.inputError : ''}`}
                    onClick={() => toggleDropdown(index, 'endYear')}
                  >
                    <span className={styles.dropdownText}>
                      {diploma.isCurrent ? 'En cours' : getDisplayText(index, 'endYear', diploma.endYear)}
                    </span>
                    <span className={styles.dropdownArrow}>▼</span>
                  </button>
                  {dropdownOpen[index]?.endYear && (
                    <div className={styles.dropdownMenu}>
                      {/* Option "En cours" */}
                      <div
                        className={`${styles.dropdownItem} ${diploma.isCurrent ? styles.selected : ''}`}
                        onClick={() => handleSelectOption(index, 'endYear', 'En cours')}
                      >
                        En cours
                      </div>
                      {/* Options d'années */}
                      {getFilteredEndYears(index).map(year => (
                        <div
                          key={year}
                          className={`${styles.dropdownItem} ${diploma.endYear === year ? styles.selected : ''}`}
                          onClick={() => {
                            updateDiploma(index, 'isCurrent', false);
                            updateDiploma(index, 'endYear', year);
                            setDropdownOpen(prev => ({
                              ...prev,
                              [index]: { ...prev[index], endYear: false }
                            }));
                          }}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Messages d'erreur */}
                {hasEndYearRequiredError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-endYear`]}
                  </div>
                )}
                {hasEndYearError && !hasEndYearRequiredError && (
                  <div className={styles.errorText}>
                    ⚠ {errors[`${diplomaKey}-endYear`]}
                  </div>
                )}
              </div>

              {role === 'tutor' && (
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Diplôme ou certificat</label>
                  <div className={styles.fileUpload}>
                    <input
                      ref={setFileInputRef(index)}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(index, e)}
                      className={styles.fileInput}
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className={styles.uploadButton}
                    >
                      📎 Téléverser un fichier
                    </button>
                    {diploma.diplomaFile && (
                      <span className={styles.fileName}>
                        {diploma.diplomaFile.name}
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
      })}

      <div className={styles.addButtonContainer}>
        <button
          type="button"
          onClick={addDiploma}
          className={styles.addButton}
        >
          <span className={styles.addIcon}>+</span>
          Ajouter un autre diplôme
        </button>
      </div>
    </div>
  );
};

export default EducationStep;