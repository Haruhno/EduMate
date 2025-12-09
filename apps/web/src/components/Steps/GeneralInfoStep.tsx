import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './GeneralInfoStep.module.css';
import defaultAvatar from '../../assets/images/avatar.jpg';
import { allCountries } from 'country-telephone-data';
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../utils/cropImage";
import { allSkills } from '../../data/skillsData';

interface GeneralInfoStepProps {
  profileData: any;
  setProfileData: (data: any) => void;
  role: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  touched: { [key: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}

interface ParsedCVData {
  personal?: {
    firstName?: string;
    lastName?: string;
    email?: string[];
    phone?: string[];
    address?: string;
    birthDate?: string;
    gender?: string;
  };
  education?: Array<{
    educationLevel: string;
    field: string;
    school: string;
    country: string;
    startYear: number;
    endYear?: number;
    isCurrent: boolean;
    diplomaName?: string;
  }>;
  experience?: Array<{
    jobTitle: string;
    employmentType: string;
    company: string;
    location: string;
    startMonth: string;
    startYear: number;
    endMonth?: string;
    endYear?: number;
    isCurrent: boolean;
    description: string;
    achievements?: string[];
  }>;
  skills?: {
    technical: string[];
    languages?: string[];
    soft?: string[];
  };
  summary?: string;
  validation?: {
    quality?: string;
  };
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
        {role === 'student'
          ? "Quelles compétences souhaitez-vous acquérir ? Tapez et appuyez sur Entrée pour ajouter. Utilisez ↑ et ↓ pour naviguer."
          : "Quelles compétences possédez-vous ? Tapez et appuyez sur Entrée pour ajouter. Utilisez ↑ et ↓ pour naviguer."
        }
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

const GeneralInfoStep: React.FC<GeneralInfoStepProps> = ({
    profileData,
    setProfileData,
    role,
    errors,
    setErrors,
    setTouched
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hasBeenValidated, setHasBeenValidated] = useState(false);
    // États du recadrage
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropping, setCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    // États pour l'import
    const [isParsing, setIsParsing] = useState(false);
    const [importStatus, setImportStatus] = useState<{ message: string; success: boolean }>({
        message: '',
        success: false,
    });
    // États pour les suggestions d'adresse
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);

    // Génère la liste des pays
    const countries = (allCountries as any[]).map((country) => ({
        name: country.name,
        code: country.dialCode,
        flag: getFlagEmoji(country.iso2.toUpperCase()),
        iso2: country.iso2.toUpperCase(),
    }));

    // Convertit un code ISO en emoji drapeau
    function getFlagEmoji(countryCode: string) {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    // Fonction pour formater les dates au format YYYY-MM-DD
    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';

        try {
            // Si c'est déjà au format YYYY-MM-DD, retourner tel quel
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }

            // Sinon, convertir depuis le format ISO
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn('Date invalide:', dateString);
                return '';
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Erreur formatage date:', error, dateString);
            return '';
        }
    };

    // Définit la France par défaut au chargement
    useEffect(() => {
        const france = countries.find((c) => c.iso2 === 'FR');
        if (france && (!profileData.countryCode || profileData.countryCode.trim() === '')) {
            setProfileData((prev: any) => ({
                ...prev,
                countryCode: france.code,
            }));
        }
    }, [countries, profileData.countryCode, setProfileData]);

    // Ferme le dropdown quand on clique dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Pour le dropdown du téléphone
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }

            // Pour les suggestions d'adresse
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                addressInputRef.current &&
                !addressInputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Récupère zone du crop
    const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Fonction de validation complète
    const validateAllFields = () => {
        const newErrors: { [key: string]: string } = { ...errors };

        // Supprimer les anciennes erreurs des champs obligatoires
        delete newErrors.firstName;
        delete newErrors.lastName;
        delete newErrors.email;
        delete newErrors.birthDate;
        delete newErrors.skills;

        let hasAnyError = false;

        // Validation des champs obligatoires
        if (!profileData.firstName?.trim()) {
            newErrors.firstName = "⚠ Le prénom est obligatoire";
            hasAnyError = true;
        }

        if (!profileData.lastName?.trim()) {
            newErrors.lastName = "⚠ Le nom est obligatoire";
            hasAnyError = true;
        }

        if (!profileData.email?.trim()) {
            newErrors.email = "⚠ L'email est obligatoire";
            hasAnyError = true;
        } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
            newErrors.email = "⚠ L'adresse e-mail n'est pas valide";
            hasAnyError = true;
        }

        // Date de naissance obligatoire seulement pour les tuteurs
        if (role === 'tutor') {
            if (!profileData.birthDate) {
                newErrors.birthDate = "⚠ La date de naissance est obligatoire";
                hasAnyError = true;
            } else {
                const birthDate = new Date(profileData.birthDate);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const isBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
                const actualAge = isBirthdayPassed ? age : age - 1;

                if (actualAge < 16) {
                    newErrors.birthDate = "⚠ Vous devez avoir au moins 16 ans pour être tuteur";
                    hasAnyError = true;
                }
            }
        }

        // Validation du téléphone (optionnel mais doit être valide si rempli)
        if (profileData.phone && profileData.phone.trim() !== '') {
            const digitsOnly = profileData.phone.replace(/\D/g, '');
            if (
                (profileData.phone.match(/\+/g)?.length || 0) > 1 ||
                digitsOnly.length < 8 ||
                digitsOnly.length > 15
            ) {
                newErrors.phone = 'Numéro de téléphone invalide';
                hasAnyError = true;
            }
        }

        setErrors(newErrors);
        setHasBeenValidated(true);
        return !hasAnyError;
    };

    // Exposer la fonction de validation au parent
    useEffect(() => {
        (window as any).validateGeneralInfoStep = validateAllFields;
    }, [profileData, role]);

    // Fonction pour rechercher des suggestions d'adresses
    const searchAddressSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setIsLoadingAddress(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=`
            );
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Erreur de recherche d\'adresses:', error);
            setSuggestions([]);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    // Fonction pour sélectionner une suggestion d'adresse
    const handleAddressSuggestionSelect = (suggestion: Suggestion) => {
        setProfileData((prev: any) => ({
            ...prev,
            address: suggestion.display_name,
            location: {
                ...prev.location,
                latitude: suggestion.lat,
                longitude: suggestion.lon,
                city: suggestion.address?.city ||
                       suggestion.address?.town ||
                       suggestion.address?.village ||
                       suggestion.address?.municipality || ''
            }
        }));
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Gérer le changement de l'adresse avec debounce
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;

        setProfileData((prev: any) => ({
            ...prev,
            address: value
        }));

        const timeoutId = setTimeout(() => {
            searchAddressSuggestions(value);
        }, 300);
        return () => clearTimeout(timeoutId);
    };

    // Quand utilisateur choisit une image
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Vérifier la taille du fichier (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev: { [key: string]: string }) => ({
                    ...prev,
                    profilePicture: 'L\'image est trop volumineuse (max 5MB)'
                }));
                return;
            }
            // Vérifier le type de fichier
            if (!file.type.startsWith('image/')) {
                setErrors((prev: { [key: string]: string }) => ({
                    ...prev,
                    profilePicture: 'Veuillez sélectionner une image valide'
                }));
                return;
            }
            const imageUrl = URL.createObjectURL(file);
            setImageToCrop(imageUrl);
            setCropping(true);
        }
    };

    // Valider le recadrage
    const handleCropConfirm = async () => {
        try {
            if (!imageToCrop || !croppedAreaPixels) return;
            const croppedImg = await getCroppedImg(imageToCrop, croppedAreaPixels);
            setProfileData((prev: any) => ({
                ...prev,
                profilePicture: croppedImg,
            }));

            // Nettoyer les URLs créées
            URL.revokeObjectURL(imageToCrop);
            setCropping(false);
            setImageToCrop(null);

            // Supprimer l'erreur si elle existait
            setErrors((prev: { [key: string]: string }) => {
                const updated = { ...prev };
                delete updated.profilePicture;
                return updated;
            });
        } catch (e) {
            console.error('Erreur lors du recadrage:', e);
            setErrors((prev: { [key: string]: string }) => ({
                ...prev,
                profilePicture: 'Erreur lors du recadrage de l\'image'
            }));
        }
    };

    // Fonction pour gérer le changement de compétences
    const handleSkillsChange = (newSkills: string[]) => {
        setProfileData((prev: any) => ({
            ...prev,
            skills: newSkills
        }));

        // Supprimer l'erreur si elle existait
        if (newSkills.length > 0) {
            setErrors((prev: { [key: string]: string }) => {
                const updated = { ...prev };
                delete updated.skills;
                return updated;
            });
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setProfileData((prev: any) => ({
            ...prev,
            [name]: value,
        }));

        // Si on a déjà validé une fois, revalider le champ modifié
        if (hasBeenValidated) {
            const newErrors = { ...errors };

            // Supprimer l'erreur pour ce champ s'il est maintenant valide
            if (value && value.trim() !== '') {
                delete newErrors[name];

                // Validation spécifique pour l'email
                if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) {
                    newErrors.email = "L'adresse e-mail n'est pas valide";
                }

                // Validation spécifique pour la date de naissance des tuteurs
                if (name === 'birthDate' && role === 'tutor' && value) {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    const isBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
                    const actualAge = isBirthdayPassed ? age : age - 1;

                    if (actualAge < 16) {
                        newErrors.birthDate = "Vous devez avoir au moins 16 ans pour être tuteur";
                    } else {
                        delete newErrors.birthDate;
                    }
                }
            }

            setErrors(newErrors);
        }

        setTouched((prev: { [key: string]: boolean }) => ({
            ...prev,
            [name]: true
        }));

        window.dispatchEvent(
            new CustomEvent('profileFieldUpdated', { detail: { field: name } })
        );
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const cleaned = value.replace(/[^\d+]/g, '');

        setProfileData((prev: any) => ({
            ...prev,
            [name]: cleaned
        }));

        // Si on a déjà validé une fois, revalider le téléphone
        if (hasBeenValidated && cleaned && cleaned.trim() !== '') {
            const digitsOnly = cleaned.replace(/\D/g, '');
            const newErrors = { ...errors };

            if ((cleaned.match(/\+/g)?.length || 0) > 1 || digitsOnly.length < 8 || digitsOnly.length > 15) {
                newErrors.phone = 'Numéro de téléphone invalide';
            } else {
                delete newErrors.phone;
            }

            setErrors(newErrors);
        }

        setTouched((prev: { [key: string]: boolean }) => ({
            ...prev,
            [name]: true
        }));

        window.dispatchEvent(
            new CustomEvent('profileFieldUpdated', { detail: { field: name } })
        );
    };

    const hasCustomPhoto = () => {
        if (!profileData.profilePicture) return false;
        if (profileData.profilePicture === defaultAvatar || profileData.profilePicture.includes('avatar'))
            return false;
        if (profileData.profilePicture.startsWith('data:image')) return true;
        if (profileData.profilePicture.startsWith('http')) return true;
        return false;
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleCountrySelect = (code: string) => {
        setProfileData((prev: any) => ({ ...prev, countryCode: code }));
        setDropdownOpen(false);
    };

    const handleCancelCrop = () => {
        if (imageToCrop) {
            URL.revokeObjectURL(imageToCrop);
        }
        setCropping(false);
        setImageToCrop(null);

        // Réinitialiser le fichier input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Fonction pour gérer l'import de fichier
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'cv' | 'linkedin') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'cv') {
                // Vérifier la taille du fichier (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    setErrors((prev: { [key: string]: string }) => ({
                        ...prev,
                        cvFile: 'Le fichier est trop volumineux (max 5MB)',
                    }));
                    return;
                }
                setProfileData((prev: any) => ({
                    ...prev,
                    cvFile: file,
                }));
                setErrors((prev: { [key: string]: string }) => {
                    const updated = { ...prev };
                    delete updated.cvFile;
                    return updated;
                });
            }
        }
    };

    // Fonction de fusion intelligente
    const intelligentlyMergeData = (
        existing: any,
        newData: ParsedCVData
    ): any => {
        const updates: any = {};

        console.log('🔄 Fusion intelligente des données:');
        console.log('Données existantes:', existing);
        console.log('Nouvelles données:', newData);

        // 1. Informations personnelles (priorité aux nouvelles données si elles sont plus complètes)
        if (newData.personal) {
            if (newData.personal.firstName && (!existing.firstName || existing.firstName.trim() === '')) {
                updates.firstName = newData.personal.firstName;
            }
            if (newData.personal.lastName && (!existing.lastName || existing.lastName.trim() === '')) {
                updates.lastName = newData.personal.lastName;
            }
            if (newData.personal.email && newData.personal.email.length > 0 &&
                (!existing.email || existing.email.trim() === '')) {
                updates.email = newData.personal.email[0];
            }
            if (newData.personal.phone && newData.personal.phone.length > 0 &&
                (!existing.phone || existing.phone.trim() === '')) {
                updates.phone = newData.personal.phone[0];
            }
            if (newData.personal.address && (!existing.address || existing.address.trim() === '')) {
                updates.address = newData.personal.address;
            }
            if (newData.personal.birthDate && (!existing.birthDate || existing.birthDate.trim() === '')) {
                updates.birthDate = newData.personal.birthDate;
            }
        }

        // 2. Compétences (fusionner sans doublons)
        if (newData.skills?.technical) {
            const currentSkills = existing.skills || [];
            updates.skills = [...new Set([...currentSkills, ...newData.skills.technical])]
                .filter(skill => skill && skill.trim() !== '')
                .sort((a, b) => a.localeCompare(b));
        }

        // 3. Formations (ajouter si nouvelle)
        if (newData.education && newData.education.length > 0) {
            const currentDiplomas = existing.diplomas || [];
            const newDiplomas = newData.education.map(edu => ({
                educationLevel: edu.educationLevel || '',
                field: edu.field || '',
                school: edu.school || '',
                country: edu.country || '',
                startYear: edu.startYear || 0,
                endYear: edu.endYear,
                isCurrent: edu.isCurrent || false,
                diplomaName: edu.diplomaName || ''
            }));

            updates.diplomas = [...currentDiplomas, ...newDiplomas];
        }

        // 4. Expériences (ajouter si nouvelle)
        if (newData.experience && newData.experience.length > 0) {
            const currentExperiences = existing.experiences || [];
            const newExperiences = newData.experience.map(exp => ({
                jobTitle: exp.jobTitle || '',
                employmentType: exp.employmentType || '',
                company: exp.company || '',
                location: exp.location || '',
                startMonth: exp.startMonth || '',
                startYear: exp.startYear || 0,
                endMonth: exp.endMonth,
                endYear: exp.endYear,
                isCurrent: exp.isCurrent || false,
                description: exp.description || ''
            }));

            updates.experiences = [...currentExperiences, ...newExperiences];
        }

        // 5. Bio/Summary (si vide)
        if (newData.summary && (!existing.bio || existing.bio.trim() === '')) {
            updates.bio = newData.summary;
        }

        console.log('✅ Mises à jour à appliquer:', updates);
        return updates;
    };

    // Fonction pour analyser le CV
    const handleParseCV = async () => {
        if (!profileData.cvFile) return;
        setIsParsing(true);
        setImportStatus({ message: '🔍 Analyse du CV en cours...', success: false });

        try {
            console.log('📤 Envoi du CV pour analyse réelle...');
            console.log('📄 Fichier:', profileData.cvFile.name, profileData.cvFile.size, 'bytes');

            const formData = new FormData();
            formData.append('cv', profileData.cvFile);

            // Essayer directement le backend principal (port 3001)
            try {
                console.log('🔄 Tentative avec backend principal sur port 3001...');

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token d\'authentification manquant. Veuillez vous reconnecter.');
                }

                const response = await fetch('http://localhost:3001/api/profile/parse-cv', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal: AbortSignal.timeout(60000) // 60 secondes pour l'analyse
                });

                console.log('📥 Réponse brute reçue, status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Erreur HTTP:', response.status, errorText);

                    if (response.status === 401) {
                        throw new Error('Session expirée. Veuillez vous reconnecter.');
                    } else if (response.status === 413) {
                        throw new Error('Fichier trop volumineux. Taille max: 5MB');
                    } else {
                        throw new Error(`Erreur serveur (${response.status}): ${errorText.substring(0, 200)}`);
                    }
                }

                const responseText = await response.text();
                console.log('📄 Réponse texte (premiers 500 chars):', responseText.substring(0, 500));

                let json;
                try {
                    json = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('❌ Erreur parsing JSON:', parseError);
                    console.error('Texte réponse:', responseText);
                    throw new Error('Réponse invalide du serveur');
                }

                console.log('📊 Données JSON parsées:', json);

                // Vérifier si ce sont des données réelles ou mockées
                if (json.data && json.data.personal && json.data.personal.firstName === "Mirmir") {
                    console.warn('⚠️ ATTENTION: Données mockées détectées!');
                    console.warn('L\'agent CV Parser ne fonctionne pas correctement sur le backend');

                    // Forcer l'extraction locale améliorée
                    console.log('🔄 Utilisation de l\'extraction locale améliorée...');
                    const extractedData = await extractImprovedCVInfo(profileData.cvFile);

                    setProfileData((prev: any) => {
                        const updates = intelligentlyMergeData(prev, extractedData);
                        console.log('✅ Mises à jour appliquées (local):', updates);
                        return { ...prev, ...updates };
                    });

                    setImportStatus({
                        message: '✅ Données extraites localement (service avancé non disponible)',
                        success: true
                    });

                    return;
                }

                if (json.success && json.data) {
                    const parsed: ParsedCVData = json.data;

                    console.log('🎉 Analyse réussie! Données extraites:');
                    console.log('- Prénom/Nom:', parsed.personal?.firstName, parsed.personal?.lastName);
                    console.log('- Email:', parsed.personal?.email);
                    console.log('- Téléphone:', parsed.personal?.phone);
                    console.log('- Compétences:', parsed.skills?.technical?.length);
                    console.log('- Formations:', parsed.education?.length);
                    console.log('- Expériences:', parsed.experience?.length);
                    console.log('- Qualité:', parsed.validation?.quality);

                    console.log('🔄 Fusion intelligente des données...');

                    setProfileData((prev: any) => {
                        const updates = intelligentlyMergeData(prev, parsed);
                        console.log('✅ Mises à jour appliquées:', updates);
                        return { ...prev, ...updates };
                    });

                    // Afficher un message détaillé
                    let message = '✅ Données importées avec succès';
                    if (parsed.validation?.quality === 'EXCELLENT') {
                        message = '🎉 Excellente extraction! Toutes les informations ont été trouvées';
                    } else if (parsed.validation?.quality === 'GOOD') {
                        message = '👍 Bonne extraction! La plupart des informations ont été trouvées';
                    } else if (parsed.validation?.quality === 'BASIC') {
                        message = '📄 Extraction basique - certaines informations manquent';
                    }

                    setImportStatus({
                        message: message,
                        success: true
                    });
                    return;
                } else {
                    console.warn('⚠️ Réponse sans succès:', json);
                    throw new Error(json.message || 'Échec de l\'analyse du CV');
                }
            } catch (backendError: any) {
                console.warn('⚠️ Backend échoué:', backendError.message);

                // Fallback à l'extraction locale améliorée
                console.log('🔄 Fallback à l\'extraction locale améliorée...');
                const extractedData = await extractImprovedCVInfo(profileData.cvFile);

                setProfileData((prev: any) => {
                    const updates = intelligentlyMergeData(prev, extractedData);
                    console.log('✅ Mises à jour appliquées (fallback):', updates);
                    return { ...prev, ...updates };
                });

                setImportStatus({
                    message: '✅ Données extraites localement (service temporairement indisponible)',
                    success: true
                });
            }
        } catch (e: any) {
            console.error('💥 Erreur complète:', e);
            console.error('Stack:', e.stack);

            setImportStatus({
                message: `❌ Erreur: ${e.message || 'Erreur inconnue'}`,
                success: false
            });
        } finally {
            setIsParsing(false);
        }
    };

    // Extraction locale améliorée
    const extractImprovedCVInfo = async (file: File): Promise<ParsedCVData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    let text = '';

                    if (file.type === 'application/pdf') {
                        console.warn('⚠️ PDF détecté - extraction limitée sans bibliothèque PDF');
                        text = 'PDF - extraction limitée. Veuillez configurer OpenAI pour une meilleure analyse.';
                    } else {
                        text = e.target?.result as string;
                    }

                    console.log('📝 Texte extrait pour analyse locale:', text.substring(0, 500) + '...');

                    // Extraction améliorée
                    const extractedData: ParsedCVData = {
                        personal: {
                            email: extractEmails(text),
                            phone: extractPhones(text)
                        },
                        skills: {
                            technical: extractImprovedSkills(text)
                        },
                        summary: extractSummary(text),
                        validation: {
                            quality: 'BASIC'
                        }
                    };

                    // Essayer d'extraire le nom depuis l'email
                    if (extractedData.personal?.email && extractedData.personal.email.length > 0) {
                        const firstEmail = extractedData.personal.email[0];
                        const namePart = firstEmail.split('@')[0];
                        const nameParts = namePart.split(/[._-]/);

                        if (nameParts.length >= 2) {
                            extractedData.personal.firstName = capitalize(nameParts[0]);
                            extractedData.personal.lastName = capitalize(nameParts.slice(1).join(' '));
                        }
                    }

                    console.log('📊 Données extraites localement:', extractedData);
                    resolve(extractedData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Erreur de lecture du fichier'));
            };

            if (file.type === 'text/plain' || file.type.includes('document') || file.type.includes('word')) {
                reader.readAsText(file);
            } else {
                // Pour les PDF et autres formats, on ne peut pas lire directement
                reader.readAsArrayBuffer(file);
            }
        });
    };

    // Fonctions d'extraction améliorées
    const extractImprovedSkills = (text: string): string[] => {
        const allSkillsList = [
            // Frontend
            'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Svelte',
            'Next.js', 'Nuxt.js', 'Webpack', 'Babel', 'Sass', 'Less', 'Tailwind CSS', 'Bootstrap',
            // Backend
            'Node.js', 'Express', 'Python', 'Django', 'Flask', 'Java', 'Spring', 'PHP',
            'Laravel', 'Symfony', 'Ruby', 'Ruby on Rails', 'Go', 'C#', '.NET', 'ASP.NET',
            'C++', 'C', 'Rust', 'Kotlin', 'Swift', 'Scala',
            // Base de données
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server',
            'Firebase', 'Supabase', 'GraphQL', 'REST API', 'SOAP', 'NoSQL',
            // DevOps & Cloud
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Git', 'GitHub',
            'GitLab', 'CI/CD', 'Jenkins', 'Travis CI', 'GitHub Actions', 'Terraform',
            'Ansible', 'Linux', 'Windows Server', 'MacOS',
            // Mobile
            'React Native', 'Flutter', 'Android', 'iOS', 'Swift', 'Kotlin',
            // Autres
            'Agile', 'Scrum', 'Jira', 'Confluence', 'Figma', 'Photoshop', 'Illustrator',
            'UI/UX', 'Design', 'Testing', 'Jest', 'Cypress', 'Selenium'
        ];
        const foundSkills: string[] = [];

        allSkillsList.forEach(skill => {
            // Recherche insensible à la casse et aux espaces
            const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(text)) {
                foundSkills.push(skill);
            }
        });
        return [...new Set(foundSkills)].sort();
    };

    const extractSummary = (text: string): string => {
        // Chercher un résumé dans les premières lignes
        const lines = text.split('\n').slice(0, 10);
        const summaryLines = lines.filter(line =>
            line.trim().length > 50 &&
            !line.toLowerCase().includes('@') &&
            !line.match(/(\+33|0)[1-9](\d{2}){4}/)
        );

        if (summaryLines.length > 0) {
            return summaryLines[0].substring(0, 200) + '...';
        }

        return '';
    };

    const capitalize = (str: string): string => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Fonctions d'extraction basiques
    const extractEmails = (text: string): string[] => {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const matches = text.match(emailRegex);
        return matches ? [...new Set(matches)] : [];
    };

    const extractPhones = (text: string): string[] => {
        const phoneRegex = /(\+33|0)[1-9](\d{2}){4}/g;
        const matches = text.match(phoneRegex);
        return matches ? [...new Set(matches)] : [];
    };

    // LinkedIn scraping
    const handleLinkedInImport = async () => {
        const linkedinUrl = prompt('Colle l\'URL de ton profil LinkedIn:');
        if (!linkedinUrl) return;
        setIsParsing(true);
        setImportStatus({ message: '', success: false });

        try {
            const response = await fetch('http://localhost:3001/api/profile/scrape-linkedin', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ linkedinUrl })
            });

            const json = await response.json();

            if (json.success && json.data) {
                const parsed: ParsedCVData = json.data;

                // Same merge logic as CV
                setProfileData((prev: any) => {
                    const updates: any = {};

                    if (parsed.personal?.firstName) updates.firstName = parsed.personal.firstName;
                    if (parsed.personal?.lastName) updates.lastName = parsed.personal.lastName;
                    if (parsed.personal?.email && parsed.personal.email.length > 0) updates.email = parsed.personal.email[0];
                    if (parsed.personal?.phone && parsed.personal.phone.length > 0) updates.phone = parsed.personal.phone[0];

                    if (parsed.skills?.technical) {
                        updates.skills = Array.from(
                            new Set([...(prev.skills || []), ...parsed.skills.technical])
                        );
                    }

                    if (parsed.education) updates.diplomas = parsed.education;
                    if (parsed.experience) updates.experiences = parsed.experience;

                    return { ...prev, ...updates };
                });

                setImportStatus({
                    message: '✅ Profil LinkedIn importé!',
                    success: true
                });
            } else {
                setImportStatus({
                    message: json.message || 'Extraction LinkedIn échouée',
                    success: false
                });
            }
        } catch (e: any) {
            console.error('LinkedIn import error', e);
            setImportStatus({
                message: 'Erreur lors de l\'import LinkedIn: ' + (e.message || 'Erreur inconnue'),
                success: false
            });
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className={styles.container}>
            <h2>Informations générales</h2>
            <p className={styles.subtitle}>
                Renseignez vos informations personnelles pour compléter votre profil
            </p>
            {/* --- Photo de profil --- */}
            <div className={styles.photoSection}>
                <div className={styles.photoContainer}>
                    <div className={styles.photoWrapper}>
                        <img
                            src={profileData.profilePicture || defaultAvatar}
                            alt="Profile"
                            className={styles.photo}
                            onError={(e) => {
                                e.currentTarget.src = defaultAvatar;
                                setProfileData((prev: any) => ({
                                    ...prev,
                                    profilePicture: defaultAvatar
                                }));
                            }}
                        />
                        <div className={styles.photoOverlay}>
                            <button
                                type="button"
                                onClick={triggerFileInput}
                                className={styles.changePhotoBtn}
                            >
                                📷
                            </button>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                    />
                    <div className={styles.photoActions}>
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className={styles.changePhotoText}
                        >
                            Changer de photo
                        </button>
                        {hasCustomPhoto() && (
                            <button
                                type="button"
                                onClick={() =>
                                    setProfileData((prev: any) => ({
                                        ...prev,
                                        profilePicture: defaultAvatar,
                                    }))
                                }
                                className={styles.deletePhotoText}
                            >
                                Supprimer la photo
                            </button>
                        )}
                    </div>

                    {errors.profilePicture && (
                        <p className={styles.errorText}>{errors.profilePicture}</p>
                    )}
                </div>
            </div>
            {/* --- Modale de recadrage --- */}
            {cropping && (
                <div className={styles.cropModal}>
                    <div className={styles.cropModalOverlay} onClick={handleCancelCrop} />
                    <div className={styles.cropModalContent}>
                        <div className={styles.cropHeader}>
                            <h3>Recadrez votre photo</h3>
                            <p>Ajustez la position et la taille de votre photo de profil</p>
                        </div>

                        <div className={styles.cropContainer}>
                            <Cropper
                                image={imageToCrop!}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                showGrid={false}
                                style={{
                                    containerStyle: {
                                        backgroundColor: '#f8f9fa'
                                    }
                                }}
                            />
                        </div>

                        <div className={styles.cropControls}>
                            <div className={styles.zoomControl}>
                                <span className={styles.zoomLabel}>Zoom</span>
                                <div className={styles.zoomSliderContainer}>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className={styles.zoomSlider}
                                        style={{
                                            '--slider-progress': `${((zoom - 1) / (3 - 1)) * 100}%`
                                        } as React.CSSProperties}
                                    />
                                </div>
                                <span className={styles.zoomValue}>{zoom.toFixed(1)}x</span>
                            </div>

                            <div className={styles.cropActions}>
                                <button
                                    onClick={handleCancelCrop}
                                    className={styles.cancelButton}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleCropConfirm}
                                    className={styles.confirmButton}
                                >
                                    Valider
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.importSection}>
                <h3>Importer vos informations</h3>
                <p className={styles.importSubtitle}>
                    Gagnez du temps en important vos données depuis un CV ou LinkedIn.
                </p>
                <div className={styles.importOptions}>
                    {/* Import depuis un fichier (PDF, DOCX) */}
                    <div className={styles.importOption}>
                        <div className={styles.importHeader}>
                            <h4>Importer un CV</h4>
                            <span className={styles.importIcon}>📄</span>
                        </div>
                        <p className={styles.importDescription}>
                            Téléchargez un CV au format PDF ou Word pour pré-remplir automatiquement vos informations.
                        </p>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleFileImport(e, 'cv')}
                            className={styles.fileInput}
                            id="cv-upload"
                        />
                        <label htmlFor="cv-upload" className={styles.importButton}>
                            <span>Choisir</span>
                        </label>
                        {profileData.cvFile && (
                            <div className={styles.filePreview}>
                                <span>Fichier sélectionné : {profileData.cvFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setProfileData((prev: any) => ({ ...prev, cvFile: null }))}
                                    className={styles.removeFile}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Import depuis LinkedIn */}
                    <div className={styles.importOption}>
                        <div className={styles.importHeader}>
                            <h4>Importer depuis LinkedIn</h4>
                            <span className={styles.importIcon}>🔗</span>
                        </div>
                        <p className={styles.importDescription}>
                            Connectez-vous à LinkedIn pour importer vos expériences et formations.
                        </p>
                        <button
                            type="button"
                            onClick={handleLinkedInImport}
                            className={styles.linkedInButton}
                            disabled={isParsing}
                        >
                            {isParsing ? 'Chargement...' : 'Importer'}
                        </button>
                    </div>
                </div>
                {/* Bouton pour analyser le fichier */}
                {profileData.cvFile && (
                    <button
                        type="button"
                        onClick={handleParseCV}
                        className={styles.parseButton}
                        disabled={isParsing}
                    >
                        {isParsing ? 'Analyse en cours...' : 'Analyser le CV'}
                    </button>
                )}
                {/* Message de succès/erreur */}
                {importStatus.message && (
                    <div className={`${styles.importStatus} ${importStatus.success ? styles.success : styles.error}`}>
                        {importStatus.message}

                        {importStatus.success && profileData.firstName && (
                            <div className={styles.importDetails}>
                                <p className={styles.importSubtitle}>Données importées :</p>
                                <ul className={styles.importList}>
                                    {profileData.firstName && profileData.lastName && (
                                        <li>👤 {profileData.firstName} {profileData.lastName}</li>
                                    )}
                                    {profileData.email && <li>📧 {profileData.email}</li>}
                                    {profileData.phone && <li>📱 {profileData.phone}</li>}
                                    {profileData.birthDate && <li>🎂 {new Date(profileData.birthDate).toLocaleDateString('fr-FR')}</li>}
                                    {profileData.address && <li>📍 {profileData.address.substring(0, 50)}...</li>}
                                    {profileData.skills?.length > 0 && <li>💼 {profileData.skills.length} compétences</li>}
                                    {profileData.diplomas?.length > 0 && <li>🎓 {profileData.diplomas.length} diplômes</li>}
                                    {profileData.experiences?.length > 0 && <li>🏢 {profileData.experiences.length} expériences</li>}
                                </ul>
                                <p className={styles.importNote}>
                                    ⚠️ Vérifiez et complétez les informations manquantes si nécessaire.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* --- Formulaire --- */}
            <div className={styles.formGrid}>
                {/* Prénom */}
                <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                        Prénom <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Entrez votre prénom"
                        value={profileData.firstName || ''}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.firstName ? styles.inputError : ''}`}
                    />
                    {hasBeenValidated && errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
                </div>
                {/* Nom */}
                <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                        Nom <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Entrez votre nom"
                        value={profileData.lastName || ''}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.lastName ? styles.inputError : ''}`}
                    />
                    {hasBeenValidated && errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
                </div>
                {/* Email */}
                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email <span className={styles.requiredMarker}>*</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="exemple@mail.com"
                        value={profileData.email || ''}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.email ? styles.inputError : ''}`}
                    />
                    {hasBeenValidated && errors.email && <p className={styles.errorText}>{errors.email}</p>}
                </div>
                {/* Téléphone */}
                <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>Téléphone</label>

                    <div className={styles.phoneInput} ref={dropdownRef}>
                        <div className={styles.customDropdown}>
                            <button
                                type="button"
                                className={styles.dropdownButton}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                {(() => {
                                    const selectedCountry = countries.find((c) => c.code === profileData.countryCode);
                                    if (selectedCountry) {
                                        return `${selectedCountry.flag} +${selectedCountry.code}`;
                                    }
                                    return '🇫🇷 +33';
                                })()}
                            </button>
                            {dropdownOpen && (
                                <ul className={styles.dropdownList}>
                                    {countries.map((country) => (
                                        <li
                                            key={country.code}
                                            className={styles.dropdownItem}
                                            onClick={() => handleCountrySelect(country.code)}
                                        >
                                            {country.flag} {country.name} (+{country.code})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <input
                            id="phone"
                            type="tel"
                            name="phone"
                            placeholder="Numéro de téléphone"
                            value={profileData.phone || ''}
                            onChange={handlePhoneChange}
                            className={`${styles.phoneField} ${hasBeenValidated && errors.phone ? styles.inputError : ''}`}
                        />
                    </div>
                    {hasBeenValidated && errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                </div>
                {/* Genre */}
                <div className={styles.formGroup}>
                    <label htmlFor="gender" className={styles.label}>
                        Genre
                    </label>
                    <select
                        id="gender"
                        name="gender"
                        value={profileData.gender || ''}
                        onChange={handleInputChange}
                        className={styles.select}
                    >
                        <option value="">Sélectionnez</option>
                        <option value="Femme">Femme</option>
                        <option value="Homme">Homme</option>
                        <option value="Autre">Autre</option>
                        <option value="Autre">Je préfère ne pas répondre</option>
                    </select>
                </div>
                {/* Date de naissance */}
                <div className={styles.formGroup}>
                    <label htmlFor="birthDate" className={styles.label}>
                        Date de naissance {role === 'tutor' && <span className={styles.requiredMarker}>*</span>}
                    </label>
                    <input
                        type="date"
                        id="birthDate"
                        name="birthDate"
                        value={formatDateForInput(profileData.birthDate || '')}
                        onChange={handleInputChange}
                        className={`${styles.input} ${hasBeenValidated && errors.birthDate ? styles.inputError : ''}`}
                        max={new Date().toISOString().split('T')[0]}
                    />
                    {hasBeenValidated && errors.birthDate && <p className={styles.errorText}>{errors.birthDate}</p>}
                </div>
                {/* Adresse avec suggestions */}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="address" className={styles.label}>Adresse personnelle</label>
                    <div className={styles.autocompleteContainer}>
                        <input
                            ref={addressInputRef}
                            type="text"
                            id="address"
                            name="address"
                            value={profileData.address || ''}
                            onChange={handleAddressChange}
                            onFocus={() => {
                                if (suggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            className={styles.inputAdress}
                            placeholder="Commencez à taper votre adresse (rue, ville, pays)..."
                            autoComplete="off"
                        />
                        {isLoadingAddress && (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner}></div>
                            </div>
                        )}
                        {showSuggestions && suggestions.length > 0 && (
                            <div ref={suggestionsRef} className={styles.suggestionsDropdown}>
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className={styles.suggestionItem}
                                        onClick={() => handleAddressSuggestionSelect(suggestion)}
                                    >
                                        <div className={styles.suggestionText}>
                                            {suggestion.display_name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className={styles.helpText}>
                        Tapez au moins 3 caractères pour voir les suggestions d'adresses internationales
                    </p>
                </div>
                {/* Description */}
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="description" className={styles.label}>À propos</label>
                    <textarea
                        id="bio"
                        name="bio"
                        placeholder="Décrivez-vous en quelques mots... (votre parcours, vos centres d'intérêt, etc.)"
                        value={profileData.bio || ''}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        rows={4}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="skills" className={styles.label}>
                        Compétences
                    </label>

                    <SkillsInput
                        skills={profileData.skills || []}
                        onSkillsChange={handleSkillsChange}
                        role={role}
                    />

                    {hasBeenValidated && errors.skills && (
                        <p className={styles.errorText}>{errors.skills}</p>
                    )}
                </div>
            </div>
            {/* Indication des champs obligatoires */}
            <div className={styles.requiredInfo}>
                <span className={styles.requiredMarker}>*</span> Champs obligatoires
            </div>
        </div>
    );
};

export default GeneralInfoStep;